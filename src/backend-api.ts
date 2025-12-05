import { PieDTO, CourseConfig, CourseDTO, RepoDTO, RepoFilter, RepoStatisticsDTO, Startup, StatsFilter, StudentFilter, GroupPieDTO, BranchInfo, StudentDetailsResult } from "./shared";
import { Settings } from "./shared"


export interface BackendApi extends CourseApi, RepoApi, StatsApi, AppApi, SettingsApi {    
    
}

export interface ScreenshotArgs {
    courseId: number,
    assignment: string,
    organisation: string, 
    repository: string, 
    user: string 
}

export interface ScreenshotApi {
    onLoadUserStats: (callback: (data: ScreenshotArgs) => void) => void;
    requestScreenshot: (filename: string) => Promise<void>;
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
    getStudents: (courseId: number) => Promise<StudentDetailsResult>
}

export interface RepoApi {
    loadRepo: (courseId: number, assignment: string, name: string) => Promise<RepoDTO>
    loadRepos: (courseId: number, assignment: string, filter: RepoFilter) => Promise<RepoDTO[]>
    getBranchInfo: (courseId: number, assignment: string, name: string) => Promise<BranchInfo>
    refreshRepo: (courseId: number, assignment: string, name: string) => Promise<void>
    switchBranch: (courseId: number, assignment: string, name: string, newBranch: string) => Promise<void>
    updateAuthorMapping: (courseId: number, name: string, mapping: { [author: string]: string }) => Promise<void>
    removeAlias: (courseId: number, name: string, aliases: { [canonical: string]: string[] }) => Promise<void>
}

export interface StatsApi {
    getRepoStats: (courseId: number, assignment: string, name: string, filter?: StatsFilter) => Promise<RepoStatisticsDTO>        
    getGroupPie: (courseId: number, assignment: string, name: string, filter?: StatsFilter) => Promise<GroupPieDTO>
    getSectionStats(courseId: number, assignment: string, section: string) : Promise<any>
    
}


