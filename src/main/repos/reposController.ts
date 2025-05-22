import { Assignment, BlameStatisticsDTO, CourseConfig, Repo, RepoDTO, RepoFilter, RepoStatisticsDTO, StatsFilter, StudentFilter } from "../../core";
import { CanvasClient, getUsernameFromName, SimpleDict } from "../canvas_client";
import { Db } from "../db";
import { FileSystem } from "../filesystem_client";
import { GithubClient, MemberResponse, RepoResponse } from "../github_client";
import { RepositoryStatistics } from "../repository_statistics";

const cacheTimeMs = 1000 /*seconds*/ * 60 /*minutes*/ * 60 /*hours*/ * 1;

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
        let repos = repoResponses.map(r => new Repo(r));
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

        let stats = await this.fileSystem.getRepoStats(savedCourseConfig.githubStudentOrg, assignment, name);
        let coreStats = new RepositoryStatistics(stats);
        let authorsGrouped = coreStats.groupByAuthor().map(st => st.getLinesTotal());
        let totals = coreStats.getLinesTotal()        
        let authors = authorsGrouped.export();

        let totalPerWeek = coreStats
            .groupByWeek(savedCourseConfig.startDate)
            .map(st => st.getLinesTotal())
            .export();
        let authorPerWeek = coreStats
            .groupByAuthor().map(st => 
                st.groupByWeek(savedCourseConfig.startDate)
                .map(st => st.getLinesTotal()))
            .export();

        return {
            total: {
                added: totals.added,
                removed: totals.removed
            },
            authors,
            weekly: {
                total: totalPerWeek,
                authors: authorPerWeek
            }
        };
    }

    async getBlameStats(courseId: number, assignment: string, name: string, filter: StatsFilter): Promise<BlameStatisticsDTO> {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        let blamePie = await this.fileSystem.getBlame(savedCourseConfig.githubStudentOrg, assignment, name);

        return {
            blamePie
        };
    }

    async getStatsByUser(courseId: number, assignment: string, name: string, filter: StudentFilter){
        let savedCourseConfig = await this.db.getCourseConfig(courseId);

        let stats = await this.fileSystem.getRepoStats(savedCourseConfig.githubStudentOrg, assignment, name);
        let coreStats = new RepositoryStatistics(stats);

        let groupedByAuthor = coreStats.groupByAuthor();
        console.log('grouped', groupedByAuthor);
        console.log('filter' , filter)
        let studentStats = groupedByAuthor.get(filter.authorName);
        let groups = [
            RepositoryStatistics.backend, 
            RepositoryStatistics.frontend,
            RepositoryStatistics.markup,
            RepositoryStatistics.docs
        ]

        let total = studentStats.groupBy(groups).map(g => g.getLinesTotal()).export();
        let weekly = studentStats.groupByWeek(savedCourseConfig.startDate)
            .map(w => w.groupBy(groups).map(g => g.getLinesTotal())).export();
        return {
            total: total,
            weekly: weekly
        }        
    }
}