import { RepoResponse } from "./main/github_client";

export type Member ={
    login: string;
}

export type Assignment = {
    githubAssignment: string,
    canvasId?: number,
    groupAssignment: boolean
}

export class Repo {
    lastMemberCheck: Date;
    name: string;
    organization: string;
    api_url: string;
    ssh_url: string;
    http_url: string;
    members: Member[] = [];

    constructor(private response: RepoResponse) {
        this.name = response.name;
        // this.organization = response.organization.login;
        this.organization = response.full_name.split('/')[0]; //Org is ineens leeg? Vreemd
        this.api_url = response.url;
        this.ssh_url = response.ssh_url;
        this.http_url = response.html_url;
        this.lastMemberCheck = response.lastMemberCheck;
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

export type BlameStatisticsDTO = {
    blamePie: { [name: string] : number}
}

export type RepoStatisticsPerWeekDTO = {
    total: LinesStatistics[],
    authors: { [name: string] : LinesStatistics[]}
}
