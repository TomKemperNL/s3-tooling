import { BlameStatisticsDTO, CourseConfig, CourseDTO, RepoDTO, RepoFilter, RepoStatisticsDTO, Startup, StatsFilter, StudentFilter } from "../shared";
import { Settings } from "../shared"


export interface BackendApi {
    test: string,
    startup: () => Promise<Startup>
    openDirectory: (currentPath?: string) => Promise<string>
    saveSettings: (settings: Settings) => Promise<void>
    loadSettings: () => Promise<Settings>
    getCourses: () => Promise<CourseConfig[]>
    loadCourse: (id: number) => Promise<CourseDTO>
    loadRepos: (courseId: number, assignment: string, filter: RepoFilter) => Promise<RepoDTO[]>
    getRepoStats: (courseId: number, assignment: string, name: string, filter: StatsFilter) => Promise<RepoStatisticsDTO>
    getBlameStats: (courseId: number, assignment: string, name: string, filter: StatsFilter) => Promise<BlameStatisticsDTO>
    getStudentStats: (courseId: number, assignment: string, name: string, filter: StudentFilter) => Promise<any>
    getBranchInfo: (courseId: number, assignment: string, name: string) => Promise<any>
    refreshRepo: (courseId: number, assignment: string, name: string) => Promise<void>
    switchBranch: (courseId: number, assignment: string, name: string, newBranch: string) => Promise<void>
}


