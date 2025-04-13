import { CourseConfig, CourseDTO, RepoDTO, RepoFilter, RepoStatisticsDTO, StatsFilter } from "../core";

declare global {
    interface Window {
        electron: ElectronIPC;
    }
}

export interface ElectronIPC {
    test: string,
    getCourses: () => Promise<CourseConfig[]>
    loadCourse: (id: number) => Promise<CourseDTO>
    loadRepos: (courseId: number, assignment: string, filter: RepoFilter) => Promise<RepoDTO[]>
    getRepoStats: (courseId: number, assignment: string, name: string, filter: StatsFilter) => Promise<RepoStatisticsDTO>
}


