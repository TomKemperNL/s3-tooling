import { RepoResponse } from "./main/github-client";

export type Member ={
    login: string;
}

export type Assignment = {
    githubAssignment: string,
    canvasId?: number,
    groupAssignment: boolean
}

export type Startup = {
    validSettings: boolean,
    githubUser: string,
    canvasUser: string
}

export class Repo {  
    members: Member[] = [];

    constructor(public name: string, 
                public organization: string, 
                public api_url: string, 
                public ssh_url: string, 
                public http_url: string,
                public lastMemberCheck: Date) {
        
    }   
    
    matchesAssignment(assignment: Assignment) {
        return this.name.startsWith(assignment.githubAssignment);
    }
}

export type CourseConfig = {
    name: string;
    canvasCourseId: number;    
    canvasGroupsName: string;
    startDate: Date,
    githubStudentOrg: string;    
    assignments: Assignment[],
    lastRepoCheck: Date,
    lastSectionCheck: Date,
    lastMappingCheck: Date
}

export type StudentDTO = {
    studentId: number;
    name: string;
    email: string;
}

export type CourseDTO = {
    canvasId: number,
    name: string    
    sections: { [key: string] : StudentDTO[] },
    assignments: Assignment[]    
}

export type RepoFilter = {
    sections: string[]
}

export type RepoDTO = {
    courseId: number,
    assignment: string,
    name: string,
    groupRepo: boolean
}

export type StatsFilter = {
    filterString: string
}

export type StudentFilter = {
    authorName: string
}


export type LinesStatistics = {
    added: number,
    removed: number
}

export type RepoStatisticsDTO = {
    total: LinesStatistics,
    authors: { [name: string] : LinesStatistics}
    weekly: RepoStatisticsPerWeekDTO,
}

export type AuthorStatisticsDTO = {
    total: { [group: string]: LinesStatistics },    
    weekly: { [group: string]: LinesStatistics }[],
}

export type BlameStatisticsDTO = {
    blamePie: { [name: string] : number}
}

export type RepoStatisticsPerWeekDTO = {
    total: LinesStatistics[],
    authors: { [name: string] : LinesStatistics[]}
}
