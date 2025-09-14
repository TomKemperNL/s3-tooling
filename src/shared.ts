
export type Member ={
    login: string;
}

export type Author = {
    name: string,
    email?: string,
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
    canvasId: number;    
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
    groupRepo: boolean,
    members: string[]
    url: string
}

export type StatsFilter = {
    authors?: string[],
}

export type StudentFilter = {
    authorName: string
}


export type LinesStatistics = {
    added: number,
    removed: number
}
export function combineStats(...stats: LinesStatistics[]): LinesStatistics {
    return stats.reduce((acc, stat) => ({
        added: acc.added + stat.added,
        removed: acc.removed + stat.removed
    }), { added: 0, removed: 0 });
}


export type RepoStatisticsDTO = {
    authors: string[],
    groups: string[],
    aliases: { [name: string]: string[] },
    week_group_author: Record<string, Record<string, LinesStatistics>>[],
}

export type RepoStatisticsDTOPerGroup = {
    total: LinesStatistics,
    groups: { [name: string] : LinesStatistics}
    weekly: RepoStatisticsPerWeekDTOPerGroup,
}

export type AuthorStatisticsDTO = {
    total: { [group: string]: LinesStatistics },    
    weekly: { [group: string]: LinesStatistics }[],
}

export type PieDTO = {
    aliases: { [name: string]: string[] },
    pie: { [name: string] : number}
}

export type GroupPieDTO = {
    aliases: { [name: string]: string[] },
    groupedPie: Record<string, Record<string,number>>
}

export type RepoStatisticsPerWeekDTO = {
    total: LinesStatistics[],
    authors: { [name: string] : LinesStatistics[]}
}
export type RepoStatisticsPerWeekDTOPerGroup = {
    total: LinesStatistics[],
    groups: { [name: string] : LinesStatistics[]}
}

export type Settings = {
    authorizedUsers: string[];
    githubToken: string;
    canvasToken: string;
    keepDB: boolean;
    ignoreAuthors: string[];
    dataPath: string;
}

export type Comment = {
    body: string,
    createdAt: Date,
    author: string,
}

export type Issue = {
    title: string,
    body: string,
    createdAt: Date,
    author: string,
    comments: Comment[]
}

export type PullRequest = Issue

export type BranchInfo = {
    currentBranch: string,
    availableBranches: string[],
}