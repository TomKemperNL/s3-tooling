import { url } from "inspector";
import { RepoApi } from "../backend-api";
import { ipc } from "../electron-setup";
import { Assignment, PieDTO, BranchInfo, combineStats, CourseConfig, Repo, RepoDTO, RepoFilter, RepoStatisticsDTO, StatsFilter, StudentFilter } from "../shared";
import { CanvasClient, getUsernameFromName, SimpleDict, StringDict } from "./canvas-client";
import { Db } from "./db";
import { FileSystem } from "./filesystem-client";
import { GithubClient, MemberResponse, RepoResponse, toRepo } from "./github-client";
import { ProjectStatistics } from "./project-statistics";
import { RepositoryStatistics } from "./repository-statistics";

const cacheTimeMs = 1000 /*seconds*/ * 60 /*minutes*/ * 60 /*hours*/ * 1;

function mergePies(pie1: { [name: string]: number }, pie2: { [name: string]: number }): { [name: string]: number } {
    let merged: { [name: string]: number } = {};
    for (let key in pie1) {
        merged[key] = (merged[key] || 0) + pie1[key];
    }
    for (let key in pie2) {
        merged[key] = (merged[key] || 0) + pie2[key];
    }
    return merged;
}

export class ReposController implements RepoApi{

    constructor(private db: Db, private canvasClient: CanvasClient, private githubClient: GithubClient, private fileSystem: FileSystem) {

    }

    async #getUserMapping(savedCourseConfig: CourseConfig): Promise<SimpleDict> {
        let usermapping: StringDict = null;

        if (savedCourseConfig.lastMappingCheck && (savedCourseConfig.lastMappingCheck.valueOf() + cacheTimeMs) > new Date().valueOf()) {
            usermapping = await this.db.getUserMapping(savedCourseConfig.canvasId);
        } else {
            for (let a of savedCourseConfig.assignments) {
                if (!a.groupAssignment) {
                    usermapping = await this.canvasClient.getGithubMapping(
                        { course_id: savedCourseConfig.canvasId },
                        { assignment_id: a.canvasId }
                        , a.githubAssignment);
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

    @ipc('repos:load')
    async loadRepos(courseId: number, assignmentName: string, filter: RepoFilter): Promise<RepoDTO[]> {
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
            members: r.members.map(m => m.login),
            courseId: savedCourse.canvasId,
            assignment: assignment.githubAssignment,
            groupRepo: assignment.groupAssignment,
            name: r.name,
            url: r.http_url,
        }));
    }

    @ipc("repos:getBranchInfo")
    async getBranchInfo(courseId: number, assignment: string, name: string): Promise<BranchInfo> {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        let defaultBranch = await this.fileSystem.getDefaultBranch(savedCourseConfig.githubStudentOrg, assignment, name);
        if (!defaultBranch) {
            defaultBranch = 'main'; // fallback to main if no default branch is found
        }

        let [currentBranch, branches] = await Promise.all([
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
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        this.githubClient.clearCache(savedCourseConfig.githubStudentOrg, name);
        await this.fileSystem.refreshRepo(savedCourseConfig.githubStudentOrg, assignment, name);
    }

    @ipc("repos:switchBranch")
    async switchBranch(courseId: number, assignment: string, name: string, newBranch: string): Promise<void> {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        await this.fileSystem.switchBranch(newBranch, savedCourseConfig.githubStudentOrg, assignment, name)
    }




    async getCurrentUserMappingFromCourse(courseId: number, assignment: string): Promise<any> {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        let savedCourse = await this.db.getCourse(courseId);

        let sectionsResults: any = {};

        let loadRepo = async (repo: RepoDTO): Promise<any> => {
            let users = (await this.githubClient.getMembers(savedCourseConfig.githubStudentOrg, repo.name)).map(m => m.login);
            let commits = await this.fileSystem.getRepoStats(
                savedCourseConfig.githubStudentOrg, assignment, repo.name);
            let stats = new RepositoryStatistics(commits);
            let authors = stats.getDistinctAuthors();
            return { authors, users };
        }

        let loadSection = async (section: string): Promise<any> => {
            let currentSectionResult: any = {}
            let reposForSection = await this.loadRepos(courseId, assignment, {
                sections: [section]
            });

            await Promise.all(
                reposForSection.map(async repo => {
                    let result = await loadRepo(repo);
                    currentSectionResult[repo.name] = result;
                }));

            return currentSectionResult;
        }

        for(let section of Object.keys(savedCourse.sections)) {
            let currentSectionResult = await loadSection(section);
                sectionsResults[section] = currentSectionResult;
        }

        return sectionsResults;
    }
}

