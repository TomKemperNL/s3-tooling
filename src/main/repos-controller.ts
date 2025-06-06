import { Assignment, BlameStatisticsDTO, combineStats, CourseConfig, Repo, RepoDTO, RepoFilter, RepoStatisticsDTO, StatsFilter, StudentFilter } from "../shared";
import { CanvasClient, getUsernameFromName, SimpleDict } from "./canvas-client";
import { Db } from "./db";
import { FileSystem } from "./filesystem-client";
import { GithubClient, MemberResponse, RepoResponse, toRepo } from "./github-client";
import { ProjectStatistics } from "./project-statistics";
import { RepositoryStatistics } from "./repository-statistics";

const cacheTimeMs = 1000 /*seconds*/ * 60 /*minutes*/ * 60 /*hours*/ * 1;

function mergePies(pie1: {[name:string]: number}, pie2: {[name:string]: number}): {[name:string]: number} {
    let merged: {[name:string]: number} = {};
    for (let key in pie1) {
        merged[key] = (merged[key] || 0) + pie1[key];
    }
    for (let key in pie2) {
        merged[key] = (merged[key] || 0) + pie2[key];
    }
    return merged;
}

export class ReposController {

    constructor(private db: Db, private canvasClient: CanvasClient, private githubClient: GithubClient, private fileSystem: FileSystem) {

    }

    async #getUserMapping(savedCourseConfig: CourseConfig): Promise<SimpleDict> {
        let usermapping: SimpleDict = null;

        if (savedCourseConfig.lastMappingCheck && (savedCourseConfig.lastMappingCheck.valueOf() + cacheTimeMs) > new Date().valueOf()) {
            usermapping = await this.db.getUserMapping(savedCourseConfig.canvasCourseId);
        } else {
            for (let a of savedCourseConfig.assignments) {
                if (!a.groupAssignment) {
                    usermapping = await this.canvasClient.getGithubMapping(
                        { course_id: savedCourseConfig.canvasCourseId },
                        { assignment_id: a.canvasId }
                        , a.githubAssignment);
                    await this.db.updateUserMapping(savedCourseConfig.canvasCourseId, usermapping);
                }
            }
        }
        return usermapping;
    }

    async #getRepos(savedCourseConfig: CourseConfig): Promise<Repo[]> {
        let repoResponses: RepoResponse[]
        if (savedCourseConfig.lastRepoCheck && (savedCourseConfig.lastRepoCheck.valueOf() + cacheTimeMs) > new Date().valueOf()) {
            repoResponses = await this.db.selectReposByCourse(savedCourseConfig.canvasCourseId)
        } else {
            repoResponses = await this.githubClient.listRepos(savedCourseConfig.githubStudentOrg);
            await this.db.updateRepoMapping(savedCourseConfig.canvasCourseId, repoResponses);
        }
        let repos = repoResponses.map(r => toRepo(r));
        return repos;
    }

    async #updateMembers(repos: Repo[], assignment: Assignment): Promise<void> {
        async function updateSingleRepoMembers(repo: Repo): Promise<[Repo, MemberResponse[]]> {
            if (assignment.groupAssignment) {
                let collaborators: MemberResponse[];
                if (repo.lastMemberCheck && (repo.lastMemberCheck.valueOf() + cacheTimeMs) > new Date().valueOf()) {
                    collaborators = await this.db.getCollaborators(repo.organization, repo.name)
                } else {
                    collaborators = await this.githubClient.getMembers(repo.organization, repo.name);
                }
                return [repo, collaborators]
            } else {
                return Promise.resolve([repo, [{
                    login: getUsernameFromName(repo.name, assignment.githubAssignment)
                }]])
            }
        }

        let results: any = await Promise.all(repos.map(updateSingleRepoMembers.bind(this)));
        for (let [repo, collaborators] of results) {
            repo.members = collaborators;
            await this.db.updateCollaborators(repo.organization, repo.name, collaborators);
        }
    }


    async loadRepos(courseId, assignmentName, filter: RepoFilter): Promise<RepoDTO[]> {
        let savedCourse = await this.db.getCourse(courseId);
        let assignment = savedCourse.assignments.find(a => a.githubAssignment === assignmentName);
        if (!assignment) {
            throw new Error(`Assignment ${assignmentName} not found in course ${courseId}`);
        }
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        let usermapping: SimpleDict = await this.#getUserMapping(savedCourseConfig);

        let logins = filter.sections
            .flatMap(s => savedCourse.sections[s])
            .map(s => s.email)
            .map(e => usermapping[e])
            .filter(l => l !== undefined);

        let repos = await this.#getRepos(savedCourseConfig)
        repos = repos.filter(r => r.matchesAssignment(assignment));

        await this.#updateMembers(repos, assignment);
        if (filter.sections.length > 0) {
            repos = repos.filter(r => r.members.some(m => logins.some(l => m.login === l)));
        } //if there is no filter, return all repos

        await Promise.all(
            repos.map(r =>
                this.fileSystem.cloneRepo(
                    [savedCourseConfig.githubStudentOrg, assignment.githubAssignment], r).catch(console.error)));

        return repos.map(r => ({
            courseId: savedCourse.canvasId,
            assignment: assignment.githubAssignment,
            groupRepo: assignment.groupAssignment,
            name: r.name
        }));
    }

    async getRepoStats(courseId: number, assignment: string, name: string, filter: StatsFilter): Promise<RepoStatisticsDTO> {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);

        let [stats, issues, prs] = await Promise.all([
            await this.fileSystem.getRepoStats(savedCourseConfig.githubStudentOrg, assignment, name),
            await this.githubClient.listIssues(savedCourseConfig.githubStudentOrg, name),
            await this.githubClient.listPullRequests(savedCourseConfig.githubStudentOrg, name)
        ]);
        
        let coreStats = new RepositoryStatistics(stats);
        let projectStats = new ProjectStatistics(issues, prs);
        let authorsGrouped = coreStats.groupByAuthor().map(st => st.getLinesTotal());
        let prAuthorsGrouped = projectStats.groupByAuthor().map(st => st.getLines());
        let totals = coreStats.getLinesTotal();
        let prTotals = projectStats.getLines();


        let totalPerWeek = coreStats
            .groupByWeek(savedCourseConfig.startDate)
            .map(st => st.getLinesTotal())
        let prTotalPerWeek = projectStats
            .groupByWeek(savedCourseConfig.startDate)
            .map(st => st.getLines())
        let authorPerWeek = coreStats
            .groupByAuthor().map(st => 
                st.groupByWeek(savedCourseConfig.startDate)
                .map(st => st.getLinesTotal()))
        let prAuthorPerWeek = projectStats
            .groupByAuthor().map(st => 
                st.groupByWeek(savedCourseConfig.startDate)
                .map(st => st.getLines()))

        return {
            total: {
                added: totals.added + prTotals.added,
                removed: totals.removed + prTotals.removed
            },
            authors: authorsGrouped.combine(prAuthorsGrouped, combineStats).export(),
            weekly: {
                total: totalPerWeek.combine(prTotalPerWeek, combineStats).export(),
                authors: authorPerWeek
                    .combine(prAuthorPerWeek, (ea1, ea2) => ea1.combine(ea2, combineStats)).export()
            }
        };
    }

    

    async getBlameStats(courseId: number, assignment: string, name: string, filter: StatsFilter): Promise<BlameStatisticsDTO> {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        let [blamePie, issues, prs] = await Promise.all([
            this.fileSystem.getBlame(savedCourseConfig.githubStudentOrg, assignment, name),
            this.githubClient.listIssues(savedCourseConfig.githubStudentOrg, name),
            this.githubClient.listPullRequests(savedCourseConfig.githubStudentOrg, name)
        ]);
        let projectStats = new ProjectStatistics(issues, prs);
        let docsPie: {[name:string]: number} = projectStats.groupByAuthor().map(st => st.getLines().added).export(); 
        
        return {
            blamePie: mergePies(blamePie, docsPie)
        };
    }

    async getStatsByUser(courseId: number, assignment: string, name: string, filter: StudentFilter){
        let savedCourseConfig = await this.db.getCourseConfig(courseId);

        let [stats, issues, prs] = await Promise.all([
            this.fileSystem.getRepoStats(savedCourseConfig.githubStudentOrg, assignment, name),
            this.githubClient.listIssues(savedCourseConfig.githubStudentOrg, name),
            this.githubClient.listPullRequests(savedCourseConfig.githubStudentOrg, name)
        ]);
                
        let coreStats = new RepositoryStatistics(stats);
        let projectStats = new ProjectStatistics(issues, prs);

        let groupedByAuthor = coreStats.groupByAuthor();
        let prGroupedByAuthor = projectStats.groupByAuthor();
        
        let studentStats = groupedByAuthor.get(filter.authorName);
        let prStudentStats = prGroupedByAuthor.get(filter.authorName);
        if(!prStudentStats){
            prStudentStats = new ProjectStatistics([], []);
        }
        if(!studentStats){
            studentStats = new RepositoryStatistics([]);
        }
        
        let groups = [
            RepositoryStatistics.backend, 
            RepositoryStatistics.frontend,
            RepositoryStatistics.markup,
            RepositoryStatistics.docs
        ]

        let total = studentStats.groupBy(groups).map(g => g.getLinesTotal());
        let prTotal = prStudentStats.asGrouped("Communication").map(g => g.getLines());

        let weekly = studentStats.groupByWeek(savedCourseConfig.startDate)
            .map(w => w.groupBy(groups).map(g => g.getLinesTotal()));
        let prWeekly = prStudentStats.groupByWeek(savedCourseConfig.startDate)
            .map(w => w.asGrouped("Communication").map(g => g.getLines()));
        
        
        let length = Math.max(weekly.length, prWeekly.length);
        prWeekly = prWeekly.pad(length, 
            new ProjectStatistics([], []).asGrouped("Communication").map(g => g.getLines()));
        weekly = weekly.pad(length,
            new RepositoryStatistics([]).groupBy(groups).map(g => g.getLinesTotal()));


        let totalCombined = total.combine(prTotal, combineStats);    
        let weeklyCombined = weekly.combine(prWeekly, (g1, g2) => {
            return g1.combine(g2, combineStats)
        });
        
        return {
            total: totalCombined.export(),
            weekly: weeklyCombined.export()
        }        
    }
}