
import { LoggedChange, LoggedCommit } from "./main/filesystem_client";
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


export type LinesStatistics = {
    added: number,
    removed: number
}

export type RepoStatisticsDTO = {
    total: LinesStatistics,
    authors: { [name: string] : LinesStatistics}
    weekly: RepoStatisticsPerWeekDTO,
    blamePie: { [name: string] : number}
}

export type RepoStatisticsPerWeekDTO = {
    total: LinesStatistics[],
    authors: { [name: string] : LinesStatistics[]}
}

export let ignoredAuthors = [
    'github-classroom[bot]'
]

let ignoredAuthorsEnv = process.env.IGNORE_AUTHORS;
if(ignoredAuthorsEnv) {
    ignoredAuthors = ignoredAuthors.concat(ignoredAuthorsEnv.split(',').map(a => a.trim()));
}


console.log('Ignored authors:', ignoredAuthors);

export class RepositoryStatistics {
    ignoredFiles = ['package-lock.json'];

    data: LoggedCommit[];
    constructor(rawData: LoggedCommit[], public options: { ignoredExtensions: string[]} = {
        ignoredExtensions: ['.json'] //TODO: dit is dubbelop met de package-json. Even nadenken wat we willen
    }) {
        this.data = rawData.filter(c => !ignoredAuthors.includes(c.author));
    }

    #accumulateLines(acc, change: LoggedChange) {
        if (this.ignoredFiles.some(f => change.path.match(f))) {
            change.added = '-';
            change.removed = '-';
        }
        if (this.options.ignoredExtensions.some(f => change.path.endsWith(f))) {
            change.added = '-';
            change.removed = '-';
        }

        let addInc = change.added === '-' ? 0 : change.added;
        let remInc = change.removed === '-' ? 0 : change.removed;
        return { added: acc.added + addInc, removed: acc.removed + remInc };
    }
    

    getChangesByAuthor(author: string) {
        return RepositoryStatistics.#getChanges(this.data.filter(c => c.author === author));
    }

    getDistinctAuthors() {
        return [...new Set(this.data.map(c => c.author))];
    }

    getLinesTotal() : { added: number, removed: number } {
        return RepositoryStatistics.#getChanges(this.data).reduce(this.#accumulateLines.bind(this), { added: 0, removed: 0 });
    }

    getLinesPerAuthor() : {[author: string]: {added: number, removed: number}} {
        let result = {};
        for (let author of this.getDistinctAuthors()) {
            result[author] = this.getChangesByAuthor(author).reduce(this.#accumulateLines.bind(this), { added: 0, removed: 0 });
        }
        return result;
    }

    getLinesPerAuthorPerWeek(startDate: Date = null) : {[author: string]: LinesStatistics[]} {
        if(this.data.length === 0) {
            return {};
        }
        let commits = this.data.toSorted((a,b) => a.date.valueOf() - b.date.valueOf());        
        let start = startDate || commits[0].date;
        
        let result = {};
        for (let author of this.getDistinctAuthors()) {
            result[author] = this.#privGetLinesPerWeek(commits.filter(c => c.author === author), start);
        }
        return result;
        
    }

    static #addWeek(date: Date) {
        let newDate = new Date(date);
        const weekMs = 7 * 24 * 60 * 60 * 1000;        
        return new Date(newDate.valueOf() + weekMs);
    }

    static #getChanges(data: LoggedCommit[]) {
        return data.reduce((acc, commit) => {
            return acc.concat(commit.changes);
        }, [])
    }

    #privGetLinesPerWeek(someData: LoggedCommit[], startDate: Date = null): LinesStatistics[] {
        if(someData.length === 0) {
            return [];
        }
        let commits = someData.toSorted((a,b) => a.date.valueOf() - b.date.valueOf());                
        let start = startDate || commits[0].date;

        let result = []
        let currentCommits = [];
        let nextDate = RepositoryStatistics.#addWeek(start);
        let index = 0;
        while(index < commits.length){
            let c = commits[index];
            if(c.date < nextDate) {
                currentCommits.push(c);
                index++;
            } else {
                let weekStats = RepositoryStatistics.#getChanges(currentCommits).reduce(this.#accumulateLines.bind(this), { added: 0, removed: 0 });
                result.push(weekStats);                
                currentCommits = [];
                nextDate = RepositoryStatistics.#addWeek(nextDate);
            }    
        }
        if(currentCommits.length > 0) {
            let weekStats = RepositoryStatistics.#getChanges(currentCommits).reduce(this.#accumulateLines.bind(this), { added: 0, removed: 0 });
            result.push(weekStats);                
        }
        return result;
    }

    getLinesPerWeek(startDate: Date = null) : LinesStatistics[] {
        return this.#privGetLinesPerWeek(this.data, startDate);
    }
}