import { PieDTO, CourseConfig, CourseDTO, RepoDTO, RepoFilter, RepoStatisticsDTO, Startup, StatsFilter, StudentFilter, GroupPieDTO, BranchInfo } from "./shared";
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
    getBranchInfo: (courseId: number, assignment: string, name: string) => Promise<BranchInfo>
    refreshRepo: (courseId: number, assignment: string, name: string) => Promise<void>
    switchBranch: (courseId: number, assignment: string, name: string, newBranch: string) => Promise<void>
}

export interface StatsApi {
    getRepoStats: (courseId: number, assignment: string, name: string, filter: StatsFilter) => Promise<RepoStatisticsDTO>        
    getGroupPie: (courseId: number, assignment: string, name: string, filter: StatsFilter) => Promise<GroupPieDTO>
    updateAuthorMapping: (courseId: number, name: string, mapping: { [author: string]: string }) => Promise<void>
    removeAlias: (courseId: number, name: string, aliases: { [canonical: string]: string[] }) => Promise<void>
}


