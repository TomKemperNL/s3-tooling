
import { LoggedCommit } from "./main/filesystem_client";
import { RepoResponse } from "./main/github_client";

export type Member ={
    login: string;
}

export type Assignment = {
    name: string,
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
        return this.name.startsWith(assignment.name);
    }
}

export type CourseConfig = {
    name: string;
    canvasCourseId: number;
    canvasVerantwoordingAssignmentId: number;
    canvasGroupsName: string;

    githubStudentOrg: string;
    verantwoordingAssignmentName: string;
    projectAssignmentName: string;

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

export type RepoStatisticsDTO = {
    totalAdded: number,
    totalRemoved: number,
    authors: { [name: string] : {added: number, removed: number}}
}

function accumulateLines(acc, change) {
    let addInc = change.added === '-' ? 0 : change.added;
    let remInc = change.removed === '-' ? 0 : change.removed;
    return { added: acc.added + addInc, removed: acc.removed + remInc };
}

export class RepositoryStatistics {
    constructor(public rawData: LoggedCommit[]) {

    }

    getChangesByAuthor(author: string) {
        return this.rawData.filter(c => c.author === author).reduce((acc, commit) => {
            return acc.concat(commit.changes);
        }, []);
    }

    getDistinctAuthors() {
        return [...new Set(this.rawData.map(c => c.author))];
    }

    getLinesTotal() : { added: number, removed: number } {
        let changes = this.rawData.reduce((acc, commit) => {
            return acc.concat(commit.changes);
        }, [])
        
        return changes.reduce(accumulateLines, { added: 0, removed: 0 });
    }

    getLinesPerAuthor() : {[author: string]: {added: number, removed: number}} {
        let result = {};
        for (let author of this.getDistinctAuthors()) {
            result[author] = this.getChangesByAuthor(author).reduce(accumulateLines, { added: 0, removed: 0 });
        }
        return result;
    }
}