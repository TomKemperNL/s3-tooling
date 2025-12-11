import { RepoApi } from "../backend-api";
import { ipc } from "../electron-setup";
import { Assignment, BranchInfo, CourseConfig, Repo, RepoDTO, RepoFilter } from "../shared";
import { get, path } from "../web-setup";
import { CanvasClient, SimpleDict, StringDict } from "./canvas-client";
import { Db } from "./db";
import { FileSystem } from "./filesystem-client";
import { GithubClient, MemberResponse, RepoResponse, toRepo } from "./github-client";
import { RepositoryStatistics } from "./repository-statistics";

const cacheTimeMs = 1000 /*seconds*/ * 60 /*minutes*/ * 60 /*hours*/ * 1;


export function getUsernameFromNameAndAssignment(repoName: string, assignment: Assignment){
    
    if(!assignment.parts || assignment.parts.length === 0){
        return repoName.slice(assignment.name.length +1);
    }else{
        let matchingAssignments = assignment.parts.filter(p => repoName.startsWith(p));
        let bestMatch = matchingAssignments.sort((a,b) => b.length - a.length)[0];
        if(bestMatch){
            return repoName.slice(bestMatch.length + 1)
        }else{
            throw new Error(`Cannot extract username from repo name ${repoName} for assignment ${assignment.name} with parts ${assignment.parts}`);
        }
    }    
}


function mergePies(pie1: { [name: string]: number }, pie2: { [name: string]: number }): { [name: string]: number } {
    const merged: { [name: string]: number } = {};
    for (const key in pie1) {
        merged[key] = (merged[key] || 0) + pie1[key];
    }
    for (const key in pie2) {
        merged[key] = (merged[key] || 0) + pie2[key];
    }
    return merged;
}

export class ReposController implements RepoApi {

    constructor(private db: Db, private canvasClient: CanvasClient, private githubClient: GithubClient, private fileSystem: FileSystem) {

    }

    async #getUserMapping(savedCourseConfig: CourseConfig): Promise<SimpleDict> {
        let usermapping: StringDict = null;

        if (savedCourseConfig.lastMappingCheck && (savedCourseConfig.lastMappingCheck.valueOf() + cacheTimeMs) > new Date().valueOf()) {
            usermapping = await this.db.getStudentMailToGHUserMapping(savedCourseConfig.canvasId);
        } else {
            for (const a of savedCourseConfig.assignments) {
                if (!a.groupAssignment && a.canvasId) {
                    usermapping = await this.canvasClient.getGithubMapping(
                        { course_id: savedCourseConfig.canvasId },
                        { assignment_id: a.canvasId }
                        , a.name);
                    await this.db.updateUserMapping(savedCourseConfig.canvasId, usermapping);
                }
            }
        }
        return usermapping;
    }

    async #getRepos(savedCourseConfig: CourseConfig): Promise<Repo[]> {
        let repoResponses: RepoResponse[]
        if (savedCourseConfig.lastRepoCheck && (savedCourseConfig.lastRepoCheck.valueOf() + cacheTimeMs) > new Date().valueOf()) {
            repoResponses = await this.db.selectReposByCourse(savedCourseConfig.canvasId)
        } else {
            repoResponses = await this.githubClient.listRepos(savedCourseConfig.githubStudentOrg);
            await this.db.updateRepoMapping(savedCourseConfig.canvasId, repoResponses);
        }
        const repos = repoResponses.map(r => toRepo(r));
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
                    login: getUsernameFromNameAndAssignment(repo.name, assignment)
                }]])
            }
        }

        const results: any = await Promise.all(repos.map(updateSingleRepoMembers.bind(this)));
        for (const [repo, collaborators] of results) {
            repo.members = collaborators;
            await this.db.updateCollaborators(repo.organization, repo.name, collaborators);
        }
    }

    @ipc("repos:loadSingle")
    async loadRepo(courseId: number, assignmentName: string, name: string): Promise<RepoDTO> {
        const savedCourse = await this.db.getCourse(courseId);
        const assignment = savedCourse.assignments.find(a => a.name === assignmentName);
        if (!assignment) {
            throw new Error(`Assignment ${assignmentName} not found in course ${courseId}`);
        }
        const savedCourseConfig = await this.db.getCourseConfig(courseId);
        const repos = await this.db.selectReposByCourse(savedCourseConfig.canvasId)
        const r = repos.map(toRepo).find(r => r.name === name);
        return {
            members: r.members.map(m => m.login),
            courseId: savedCourse.canvasId,
            assignment: assignment.name,
            groupRepo: assignment.groupAssignment,
            name: r.name,
            url: r.http_url,
        }
    }

    @ipc('repos:load')
    async loadRepos(courseId: number, assignmentName: string, filter: RepoFilter): Promise<RepoDTO[]> {
        const savedCourse = await this.db.getCourse(courseId);
        const assignment = savedCourse.assignments.find(a => a.name === assignmentName);
        if (!assignment) {
            throw new Error(`Assignment ${assignmentName} not found in course ${courseId}`);
        }
        const savedCourseConfig = await this.db.getCourseConfig(courseId);
        let repos = await this.#getRepos(savedCourseConfig)
        repos = repos.filter(r => r.matchesAssignment(assignment));


        await this.#updateMembers(repos, assignment);
        const usermapping: SimpleDict = await this.#getUserMapping(savedCourseConfig);

        if (filter.sections.length > 0) {            
            const logins = filter.sections
                .flatMap(s => savedCourse.sections[s])
                .map(s => s.email)
                .map(e => usermapping[e])
                .filter(l => l !== undefined);


            repos = repos.filter(r => r.members.some(m => logins.some(l => m.login === l)));
        } //if there is no filter, return all repos

        await Promise.all(
            repos.map(r =>
                this.fileSystem.cloneRepo(
                    [savedCourseConfig.githubStudentOrg, assignment.name], r).catch(console.error)));

        return repos.map(r => ({
            members: r.members.map(m => m.login),
            courseId: savedCourse.canvasId,
            assignment: assignment.name,
            groupRepo: assignment.groupAssignment,
            name: r.name,
            url: r.http_url,
        }));
    }

    @ipc("repos:getBranchInfo")
    async getBranchInfo(courseId: number, assignment: string, name: string): Promise<BranchInfo> {
        const savedCourseConfig = await this.db.getCourseConfig(courseId);
        let defaultBranch = await this.fileSystem.getDefaultBranch(savedCourseConfig.githubStudentOrg, assignment, name);
        if (!defaultBranch) {
            defaultBranch = 'main'; // fallback to main if no default branch is found
        }

        const [currentBranch, branches] = await Promise.all([
            this.fileSystem.getCurrentBranch(savedCourseConfig.githubStudentOrg, assignment, name),
            this.fileSystem.getBranches(defaultBranch, savedCourseConfig.githubStudentOrg, assignment, name)]);

        if (branches.indexOf(currentBranch) === -1) {
            branches.push(currentBranch);
        }
        if (branches.indexOf(defaultBranch) === -1) {
            branches.push(defaultBranch);
        }
        branches.sort();

        return {
            currentBranch: currentBranch,
            availableBranches: branches
        };
    }

    @ipc("repos:refresh")
    async refreshRepo(courseId: number, assignment: string, name: string): Promise<void> {
        const savedCourseConfig = await this.db.getCourseConfig(courseId);
        this.githubClient.clearCache(savedCourseConfig.githubStudentOrg, name);
        await this.fileSystem.refreshRepo(savedCourseConfig.githubStudentOrg, assignment, name);
    }

    @ipc("repos:switchBranch")
    async switchBranch(courseId: number, assignment: string, name: string, newBranch: string): Promise<void> {
        const savedCourseConfig = await this.db.getCourseConfig(courseId);
        await this.fileSystem.switchBranch(newBranch, savedCourseConfig.githubStudentOrg, assignment, name)
    }


    @ipc("author-mapping:update")
    async updateAuthorMapping(courseId: number, name: string, mapping: { [author: string]: string }) {
        const savedCourseConfig = await this.db.getCourseConfig(courseId);
        await this.db.updateAuthorMapping(savedCourseConfig.githubStudentOrg, name, mapping);
    }

    @ipc("author-mapping:remove")
    async removeAlias(courseId: number, name: string, aliases: { [canonical: string]: string[]; }): Promise<void> {
        const savedCourseConfig = await this.db.getCourseConfig(courseId);
        await this.db.removeAliases(savedCourseConfig.githubStudentOrg, name, aliases);
    }

    @get("/author-mapping/:cid/:assignment")
    async exportAuthorMapping(@path(":cid") courseId: number, @path(":assignment") assignmentName?: string): Promise<Record<string, StringDict>> {
        const savedCourseConfig = await this.db.getCourseConfig(courseId);
        let repos = await this.db.selectReposByCourse(savedCourseConfig.canvasId);
        if(assignmentName){
            repos = repos.filter(r => r.name.startsWith(assignmentName + '-'));
        }
        

        const result: Record<string, StringDict> = {};
        for(let r of repos){
            const mapping = await this.db.getAuthorMapping(savedCourseConfig.githubStudentOrg, r.name);
            result[r.name] = mapping;
        }

        for(let key of Object.keys(result)){
            let mapping = result[key];
            if(Object.keys(mapping).length === 0){
                delete result[key];
            }
        }

        return result;
    }
}

