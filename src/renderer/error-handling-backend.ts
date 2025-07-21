import { BlameStatisticsDTO, BranchInfo, CourseConfig, CourseDTO, RepoDTO, RepoFilter, RepoStatisticsDTO, Startup, StatsFilter, StudentFilter } from "../shared";
import { Settings } from "../shared";
import { BackendApi } from "./backend";

//Allemaal CoPilot z'n schuld ;)
export class ErrorHandlingBackendApi implements BackendApi {
    private ipc: BackendApi;

    constructor(ipc: BackendApi) {
        this.ipc = ipc;
    }
    async getBranchInfo(courseId: number, assignment: string, name: string) : Promise<BranchInfo>{
        try{
            return await this.ipc.getBranchInfo(courseId, assignment, name);
        }
        catch (error) {
            console.error("Error fetching branch info:", error);
            alert("Failed to load branch info:" + error.message);
            throw error; // Rethrow the error to be handled by the caller
        }        
    }

    async refreshRepo(courseId: number, assignment: string, name: string): Promise<void>{
        try{
            await this.ipc.refreshRepo(courseId, assignment, name);
        }catch (error) {
            console.error("Error refreshing repository:", error);
            alert("Failed to refresh repository:" + error.message);
            throw error; // Rethrow the error to be handled by the caller
        }
    };

    async switchBranch(courseId: number, assignment: string, name: string, newBranch: string): Promise<void>{
        try {
            await this.ipc.switchBranch(courseId, assignment, name, newBranch);
        } catch (error) {
            console.error("Error switching branch:", error);
            alert("Failed to switch branch:" + error.message);
            throw error; // Rethrow the error to be handled by the caller
        }
    }
    
    async openDirectory(currentPath?: string): Promise<string> {
        return this.ipc.openDirectory(currentPath);
    }

    async startup(){
        return this.ipc.startup();
    }

    async saveSettings(settings: Settings): Promise<void> {
        try {
            await this.ipc.saveSettings(settings);
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Failed to save settings:" + error.message);
        }
    }

    async loadSettings(): Promise<Settings> {
        try {
            return await this.ipc.loadSettings();
        } catch (error) {
            console.error("Error loading settings:", error);
            alert("Failed to load settings:" + error.message);
            return {} as Settings; // Return an empty object on error
        }
    }

    async getCourses(): Promise<CourseConfig[]> {
        try {
            return await this.ipc.getCourses();
        } catch (error) {
            console.error("Error fetching courses:", error);
            alert("Failed to load courses:" + error.message);
            return [];
        }
    }
    async loadCourse(id: number): Promise<CourseDTO> {
        try {
            return await this.ipc.loadCourse(id);
        } catch (error) {
            console.error("Error loading course:", error);
            alert("Failed to load course:" + error.message);
            return {} as CourseDTO; // Return an empty object on error
        }
    }
    async loadRepos(courseId: number, assignment: string, filter: RepoFilter): Promise<RepoDTO[]> {
        try {
            return await this.ipc.loadRepos(courseId, assignment, filter);
        } catch (error) {
            console.error("Error loading repositories:", error);
            alert("Failed to load repositories:" + error.message);
            return [];
        }
    }
    async getRepoStats(courseId: number, assignment: string, name: string, filter: StatsFilter): Promise<RepoStatisticsDTO> {
        try {
            return await this.ipc.getRepoStats(courseId, assignment, name, filter);
        } catch (error) {
            console.error("Error fetching repository stats:", error);
            alert("Failed to load repository stats:" + error.message);
            return {} as RepoStatisticsDTO; // Return an empty object on error
        }
    }
    async getBlameStats(courseId: number, assignment: string, name: string, filter: StatsFilter): Promise<BlameStatisticsDTO> {
        try {
            return await this.ipc.getBlameStats(courseId, assignment, name, filter);
        } catch (error) {
            console.error("Error fetching blame stats:", error);
            alert("Failed to load blame stats:" + error.message);
            return {} as BlameStatisticsDTO; // Return an empty object on error
        }
    }
    async getStudentStats(courseId: number, assignment: string, name: string, filter: StudentFilter): Promise<any> {
        try {
            return await this.ipc.getStudentStats(courseId, assignment, name, filter);
        } catch (error) {
            console.error("Error fetching student stats:", error);
            alert("Failed to load student stats:" + error.message);
            return {}; // Return an empty object on error
        }
    }
    test: string = "ErrorHandlingIPC";
}