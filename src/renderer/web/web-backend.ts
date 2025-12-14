import { BackendApi } from "../../backend-api";
import { CourseConfig, CourseDTO, RepoFilter, RepoDTO, StatsFilter, RepoStatisticsDTO, GroupPieDTO, StudentFilter, Startup, Settings, BranchInfo, StudentDetailsResult, ProgressResult } from "../../shared";

export class WebBackend implements BackendApi {
    getCanvasOverview(courseId: number, studentCanvasId: number): Promise<ProgressResult> {
        throw new Error("Method not implemented.");
    }
    getStudentStats(courseId: number, username: string): Promise<any> {
        throw new Error("Method not implemented.");
    }
    getStudents: (courseId: number) => Promise<StudentDetailsResult>;
    getSectionStats(courseId: number, assignment: string, section: string): Promise<any> {
        throw new Error("Method not implemented.");
    }
    getCourses: () => Promise<CourseConfig[]>;
    loadCourse: (id: number) => Promise<CourseDTO>;
    loadRepo: (courseId: number, assignment: string, name: string) => Promise<RepoDTO>;
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
    updateAuthorMapping: (courseId: number, name: string, mapping: { [author: string]: string; }) => Promise<void>;
    removeAlias: (courseId: number, name: string, aliases: { [canonical: string]: string[]; }) => Promise<void>;
    startup: () => Promise<Startup>;
    openDirectory: (currentPath?: string) => Promise<string>;
    saveSettings: (settings: Settings) => Promise<void>;
    loadSettings: () => Promise<Settings>;

}