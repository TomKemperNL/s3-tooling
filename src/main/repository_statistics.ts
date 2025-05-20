import { LinesStatistics } from "../core";
import { LoggedChange, LoggedCommit } from "./filesystem_client";

export let ignoredAuthors = [
    'github-classroom[bot]'
]

export type GroupDefinition = {
    name: string,
    extensions: string[]
}

let ignoredAuthorsEnv = process.env.IGNORE_AUTHORS;
if (ignoredAuthorsEnv) {
    ignoredAuthors = ignoredAuthors.concat(ignoredAuthorsEnv.split(',').map(a => a.trim()));
}

console.log('Ignored authors:', ignoredAuthors);

export class RepositoryStatistics {
    ignoredFiles = ['package-lock.json'];
    ignoredFolders = ['node_modules'];

    data: LoggedCommit[];
    
    static backend: GroupDefinition = {
        name: 'Backend',
        extensions: ['.java', '.py', '.kt', '.cs', '.rb']
    }
    static frontend: GroupDefinition = {
        name: 'Frontend',
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue']
    }
    static markup: GroupDefinition = {
        name: 'Markup',
        extensions: ['.html', '.css']
    }
    static docs: GroupDefinition = {
        name: 'Docs',
        extensions: ['.md', '.txt', 'asciidoc', '.adoc', '.latex']
    }

    static frontendIncludingMarkup = {
        name: "Frontend",
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.html', '.css']
    };

    constructor(rawData: LoggedCommit[], public options: { ignoredExtensions: string[] } = {
        ignoredExtensions: ['.json'] //TODO: dit is dubbelop met de package-json. Even nadenken wat we willen
    }) {
        this.data = rawData.filter(c => !ignoredAuthors.includes(c.author));
    }

    #accumulateLines(acc, change: LoggedChange) {
        if (this.ignoredFiles.some(f => change.path.match(f))) {
            change.added = '-';
            change.removed = '-';
        }
        if (this.ignoredFolders.some(f => change.path.match(f))) {
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

    static #addWeek(date: Date) {
        let newDate = new Date(date);
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        return new Date(newDate.valueOf() + weekMs);
    }

    static #getChanges(data: LoggedCommit[]): LoggedChange[] {
        return data.reduce((acc, commit) => {
            return acc.concat(commit.changes);
        }, [])
    }

    static #filterCommit(commit: LoggedCommit, group: GroupDefinition): LoggedCommit {
        function getChangesForGroup(group: GroupDefinition, changes: LoggedChange[]): LoggedChange[] {
            return changes.filter(c => group.extensions.some(ext => c.path.toLocaleLowerCase().endsWith(ext.toLocaleLowerCase())));
        }

        let changes: LoggedChange[] = getChangesForGroup(group, commit.changes);
        return {
            ...commit,
            changes
        }
    }

    #privGetCommitsPerWeek(someData: LoggedCommit[], startDate: Date = null): LoggedCommit[][] {
        if (someData.length === 0) {
            return [];
        }
        let commits = someData.toSorted((a, b) => a.date.valueOf() - b.date.valueOf());
        let start = startDate || commits[0].date;

        let result = []
        let currentCommits = [];
        let nextDate = RepositoryStatistics.#addWeek(start);
        let index = 0;
        while (index < commits.length) {
            let c = commits[index];
            if (c.date < nextDate) {
                currentCommits.push(c);
                index++;
            } else {                
                result.push(currentCommits);
                currentCommits = [];
                nextDate = RepositoryStatistics.#addWeek(nextDate);
            }
        }
        if (currentCommits.length > 0) {            
            result.push(currentCommits);
        }
        return result;
    }
    
    getDistinctAuthors() {
        return [...new Set(this.data.map(c => c.author))];
    }

    getLinesTotal(): LinesStatistics {
        return RepositoryStatistics.#getChanges(this.data).reduce(this.#accumulateLines.bind(this), { added: 0, removed: 0 });
    }

    groupByWeek(startDate: Date = null): RepositoryStatistics[] {
        return this.#privGetCommitsPerWeek(this.data, startDate).map(cs => new RepositoryStatistics(cs, this.options));
    }

    groupByAuthor(): GroupedCollection<RepositoryStatistics> {
        let result = {};
        for (let author of this.getDistinctAuthors()) {
            let authorCommits = this.data.filter(c => c.author === author);
            let authorResult = new RepositoryStatistics(authorCommits, this.options);
            result[author] = authorResult;            
        }        
        return new GroupedCollection(result);
    }

    groupBy(groups: GroupDefinition[]) : GroupedCollection<RepositoryStatistics>  {       
        let result = {};
        for (let group of groups) {
            let groupCommits = [];
            for (let commit of this.data) {
                let filteredCommit = RepositoryStatistics.#filterCommit(commit, group);
                if (filteredCommit.changes.length > 0) {
                    groupCommits.push(filteredCommit);
                }

            }
            let groupResult = new RepositoryStatistics(groupCommits, this.options);
            result[group.name] = groupResult;
        }

        return new GroupedCollection(result);
    }
}

//Dit moet vast handiger kunnen (want nu moet je elke array functie opnieuw implementeren)
export class GroupedCollection<T> {
    constructor(public content: { [name: string]: T }){
    }

    map<Y>(fn: (r: T) => Y) : GroupedCollection<Y> {
        let result = {};
        for(let key of Object.keys(this.content)){
            result[key] = fn(this.content[key]);
        }
       
        return new GroupedCollection(result);        
    }

    filter(fn: (groupName: string, r: T) => boolean) : GroupedCollection<T> {
        let result = {};
        for(let key of Object.keys(this.content)){
            if (fn(key, this.content[key])) {
                result[key] = this.content[key];
            }
        }
        return new GroupedCollection(result);
    }
}