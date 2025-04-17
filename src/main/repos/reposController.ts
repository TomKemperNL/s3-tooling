import { CourseConfig, Repo, RepoDTO, RepoFilter, RepositoryStatistics, StatsFilter } from "../../core";
import { CanvasClient, SimpleDict } from "../canvas_client";
import { Db } from "../db";
import { FileSystem } from "../filesystem_client";
import { GithubClient, MemberResponse, RepoResponse } from "../github_client";

const cacheTimeMs = 1000 /*seconds*/ * 60 /*minutes*/ * 60 /*hours*/ * 1;

export class ReposController{
    
    constructor(private db: Db, private canvasClient: CanvasClient, private githubClient: GithubClient, private fileSystem: FileSystem){
        
    }

    async #getUserMapping(savedCourseConfig: CourseConfig): Promise<SimpleDict> {
        let usermapping: SimpleDict = null;

        if (savedCourseConfig.lastMappingCheck && (savedCourseConfig.lastMappingCheck.valueOf() + cacheTimeMs) > new Date().valueOf()) {
            usermapping = await this.db.getUserMapping(savedCourseConfig.canvasCourseId);
        } else {
            usermapping = await this.canvasClient.getGithubMapping(
                { course_id: savedCourseConfig.canvasCourseId },
                { assignment_id: savedCourseConfig.canvasVerantwoordingAssignmentId }
                , savedCourseConfig.verantwoordingAssignmentName);
            await this.db.updateUserMapping(savedCourseConfig.canvasCourseId, usermapping);
        }
        return usermapping;
    }

    async #getRepos(savedCourseConfig: CourseConfig) : Promise<Repo[]> {        
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

    async #getMembers(repo: Repo){
        let collaborators: MemberResponse[];
        if (repo.response.lastMemberCheck && (repo.response.lastMemberCheck.valueOf() + cacheTimeMs) > new Date().valueOf()) {
            collaborators = await this.db.getCollaborators(repo.response.id)
        } else {
            collaborators = await this.githubClient.getMembers(repo.organization, repo.name);
            await this.db.updateCollaborators(repo.response.id, collaborators);
        }
        return collaborators;
    }

    async loadRepos(courseId, assignment, filter: RepoFilter): Promise<RepoDTO[]> {
        let savedCourse = await this.db.getCourse(courseId);
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        let usermapping: SimpleDict = await this.#getUserMapping(savedCourseConfig);

        let repos = await this.#getRepos(savedCourseConfig);
        repos = repos.filter(r => r.matchesAssignment(assignment));
        let allResults: RepoDTO[] = []
        for (let section of filter.sections) {
            let matchingLogins = [];

            if (savedCourse.sections[section]) {
                for (let student of savedCourse.sections[section]) {
                    if (usermapping[student.email]) {
                        matchingLogins.push(usermapping[student.email]);
                    }
                }
            }
            let targetRepos = []
            for (let repo of repos) {
                if (assignment === savedCourseConfig.verantwoordingAssignmentName) { //TODO: Solo assignments anders behandelen
                    if (matchingLogins.indexOf(repo.owner(assignment)) >= 0) {
                        targetRepos.push(repo);
                    }
                } else {
                    let collaborators = await this.#getMembers(repo);
                    let logins = collaborators.map(c => c.login);

                    if (logins.some(l => matchingLogins.indexOf(l) >= 0)) {
                        targetRepos.push(repo);
                    }
                }
            }

            for (let repo of targetRepos) {
                try {
                    this.fileSystem.cloneRepo([savedCourseConfig.githubStudentOrg, assignment], repo);
                } catch (e) {
                    console.error(e); //Soowwwwyyyy
                }
            }

            let results: RepoDTO[] = targetRepos.map(r => ({
                courseId: savedCourse.canvasId,
                assignment: assignment,
                groupRepo: assignment !== savedCourseConfig.verantwoordingAssignmentName,
                name: r.name
            }));

            allResults = allResults.concat(results);
        }
        return allResults;
    }

    async getRepoStats(courseId: number, assignment: string, name: string, filter: StatsFilter) {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);

        let stats = await this.fileSystem.getRepoStats(savedCourseConfig.githubStudentOrg, assignment, name);
        let coreStats = new RepositoryStatistics(stats);
        let authors = coreStats.getLinesPerAuthor();
        let totals = coreStats.getLinesTotal()

        return {
            totalAdded: totals.added,
            totalRemoved: totals.removed,
            authors
        };
    }
}