import { BlameStatisticsDTO, CourseConfig, CourseDTO, RepoDTO, RepoFilter, RepoStatisticsDTO, Startup, StatsFilter, StudentFilter } from "./shared";
import { Settings } from "./shared"


export interface BackendApi extends CourseApi, RepoApi, StatsApi, AppApi, SettingsApi {    
    
}

export interface AppApi {
    startup: () => Promise<Startup>
    openDirectory: (currentPath?: string) => Promise<string>
}

export interface SettingsApi {
    saveSettings: (settings: Settings) => Promise<void>
    loadSettings: () => Promise<Settings>    
}

export interface CourseApi {
    getCourses: () => Promise<CourseConfig[]>
    loadCourse: (id: number) => Promise<CourseDTO>
}

export interface RepoApi {
    loadRepos: (courseId: number, assignment: string, filter: RepoFilter) => Promise<RepoDTO[]>
    getBranchInfo: (courseId: number, assignment: string, name: string) => Promise<any>
    refreshRepo: (courseId: number, assignment: string, name: string) => Promise<void>
    switchBranch: (courseId: number, assignment: string, name: string, newBranch: string) => Promise<void>
}

export interface StatsApi {
    getRepoStats: (courseId: number, assignment: string, name: string, filter: StatsFilter) => Promise<RepoStatisticsDTO>
    getBlameStats: (courseId: number, assignment: string, name: string, filter: StatsFilter) => Promise<BlameStatisticsDTO>
    getStudentStats: (courseId: number, assignment: string, name: string, filter: StudentFilter) => Promise<any>
}


