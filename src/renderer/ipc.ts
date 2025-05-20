import { BlameStatisticsDTO, CourseConfig, CourseDTO, RepoDTO, RepoFilter, RepoStatisticsDTO, StatsFilter, StudentFilter } from "../core";

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
    getBlameStats: (courseId: number, assignment: string, name: string, filter: StatsFilter) => Promise<BlameStatisticsDTO>
    getStudentStats: (courseId: number, assignment: string, name: string, filter: StudentFilter) => Promise<any>
}


