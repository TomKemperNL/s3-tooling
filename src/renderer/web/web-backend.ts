import { BackendApi } from "../../backend-api";
import { CourseConfig, CourseDTO, RepoFilter, RepoDTO, StatsFilter, RepoStatisticsDTO, GroupPieDTO, StudentFilter, Startup, Settings, BranchInfo } from "../../shared";

export class WebBackend implements BackendApi {
    getCourses: () => Promise<CourseConfig[]>;
    loadCourse: (id: number) => Promise<CourseDTO>;
    loadRepos: (courseId: number, assignment: string, filter: RepoFilter) => Promise<RepoDTO[]>;
    getBranchInfo(courseId: number, assignment: string, name: string){
        return Promise.resolve({
            currentBranch: 'main',
            availableBranches: ['main'],
        })
    }
    refreshRepo: (courseId: number, assignment: string, name: string) => Promise<void>;
    switchBranch: (courseId: number, assignment: string, name: string, newBranch: string) => Promise<void>;
    getRepoStats(courseId: number, assignment: string, name: string, filter: StatsFilter){
        return fetch(`/api/stats/${courseId}/${assignment}/${name}/weekly`).then(r => r.json());
    }
    getGroupPie(courseId: number, assignment: string, name: string, filter: StatsFilter){
        return fetch(`/api/stats/${courseId}/${assignment}/${name}/pie`).then(r => r.json());
    } 
    getStudentStats: (courseId: number, assignment: string, name: string, filter: StudentFilter) => Promise<any>;
    updateAuthorMapping: (courseId: number, name: string, mapping: { [author: string]: string; }) => Promise<void>;
    removeAlias: (courseId: number, name: string, aliases: { [canonical: string]: string[]; }) => Promise<void>;
    startup: () => Promise<Startup>;
    openDirectory: (currentPath?: string) => Promise<string>;
    saveSettings: (settings: Settings) => Promise<void>;
    loadSettings: () => Promise<Settings>;

}