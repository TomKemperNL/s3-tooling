import { BlameStatisticsDTO, CourseConfig, CourseDTO, RepoDTO, RepoFilter, RepoStatisticsDTO, StatsFilter, StudentFilter } from "../core";
import { Settings } from "../settings"

declare global {
    interface Window {
        electron: ElectronIPC;
    }
}

export interface ElectronIPC {
    test: string,
    saveSettings: (settings: Settings) => Promise<void>
    loadSettings: () => Promise<Settings>
    getCourses: () => Promise<CourseConfig[]>
    loadCourse: (id: number) => Promise<CourseDTO>
    loadRepos: (courseId: number, assignment: string, filter: RepoFilter) => Promise<RepoDTO[]>
    getRepoStats: (courseId: number, assignment: string, name: string, filter: StatsFilter) => Promise<RepoStatisticsDTO>
    getBlameStats: (courseId: number, assignment: string, name: string, filter: StatsFilter) => Promise<BlameStatisticsDTO>
    getStudentStats: (courseId: number, assignment: string, name: string, filter: StudentFilter) => Promise<any>
}


