import { getUsernameFromUrl } from "./main/canvas_client";
import { LoggedCommit } from "./main/filesystem_client";
import { RepoResponse } from "./main/github_client";

export class Repo {
    name: string;
    api_url: string;
    ssh_url: string;
    http_url: string;

    constructor(public response: RepoResponse, private config: CourseConfig) {
        this.name = response.name;
        this.api_url = response.url;
        this.ssh_url = response.ssh_url;
        this.http_url = response.html_url;
    }

    get isVerantwoordingRepo() {
        return this.name.startsWith(this.config.verantwoordingAssignmentName);
    }

    get owner() {
        return getUsernameFromUrl(this.http_url, this.config.verantwoordingAssignmentName);
    }

    get isProjectRepo() {
        return this.name.startsWith(this.config.projectAssignmentName);
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
    assignments: string[]    
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

    getLinesTotal() {
        let changes = this.rawData.reduce((acc, commit) => {
            return acc.concat(commit.changes);
        }, [])
        
        return changes.reduce(accumulateLines, { added: 0, removed: 0 });
    }

    getLinesPerAuthor() {
        let result = {};
        for (let author of this.getDistinctAuthors()) {
            result[author] = this.getChangesByAuthor(author).reduce(accumulateLines, { added: 0, removed: 0 });
        }
        return result;
    }
}