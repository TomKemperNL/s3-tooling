import { Assignment, CourseConfig, Repo, RepoDTO, RepoFilter, RepositoryStatistics, StatsFilter } from "../../core";
import { CanvasClient, getUsernameFromName, SimpleDict } from "../canvas_client";
import { Db } from "../db";
import { FileSystem } from "../filesystem_client";
import { GithubClient, MemberResponse, RepoResponse } from "../github_client";
import { getUsernameFromUrl } from "./../canvas_client";

const cacheTimeMs = 1000 /*seconds*/ * 60 /*minutes*/ * 60 /*hours*/ * 1;

export class ReposController {

    constructor(private db: Db, private canvasClient: CanvasClient, private githubClient: GithubClient, private fileSystem: FileSystem) {

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

    async #updateMembers(repo: Repo, assignment: Assignment): Promise<void> {
        
        if(assignment.groupAssignment){
            console.log('group assignment, loading members from github')
            let collaborators: MemberResponse[];
            if (repo.lastMemberCheck && (repo.lastMemberCheck.valueOf() + cacheTimeMs) > new Date().valueOf()) {
                collaborators = await this.db.getCollaborators(repo.organization, repo.name)
            } else {
                collaborators = await this.githubClient.getMembers(repo.organization, repo.name);
                await this.db.updateCollaborators(repo.organization, repo.name, collaborators);
            }
            repo.members = collaborators;
        }else{
            console.log('single assignment, inferring members from name')
            repo.members = [{
                login: getUsernameFromName(repo.name, assignment.name)
            }]
        }
    }


    async loadRepos(courseId, assignmentName, filter: RepoFilter): Promise<RepoDTO[]> {
        let savedCourse = await this.db.getCourse(courseId);
        let assignment = savedCourse.assignments.find(a => a.name === assignmentName);
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
        for(let r of repos){ //TODO: Dit mag niet met promise.all, daar moet een test voor komen
            await this.#updateMembers(r, assignment);
        }
        console.log(`Found ${repos.length} repos for assignment ${assignment.name}`);
        repos = repos.filter(r => r.members.some(m => logins.some(l => m.login === l)));
        console.log(`Found ${repos.length} repos for assignment ${assignment.name} and sections ${filter.sections}`);

        for (let repo of repos) {
            try {
                this.fileSystem.cloneRepo([savedCourseConfig.githubStudentOrg, assignment.name], repo);
            } catch (e) {
                console.error(e); //Soowwwwyyyy
            }
        }
        return repos.map(r => ({
            courseId: savedCourse.canvasId,
            assignment: assignment.name,
            groupRepo: assignment.groupAssignment,
            name: r.name
        }));
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