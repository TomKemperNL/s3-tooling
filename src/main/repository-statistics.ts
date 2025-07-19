import { LinesStatistics } from "../shared";
import { LoggedChange, LoggedCommit } from "./filesystem-client";
import { CombinedStats, ExportingArray, GroupDefinition, GroupedCollection, Statistics } from "./statistics";

export let ignoredAuthors = [
    'github-classroom[bot]'
]

let ignoredAuthorsEnv = process.env.IGNORE_AUTHORS;
if (ignoredAuthorsEnv) {
    ignoredAuthors = ignoredAuthors.concat(ignoredAuthorsEnv.split(',').map(a => a.trim()));
}

console.log('Ignored authors:', ignoredAuthors);

export class RepositoryStatistics implements Statistics {
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
        ignoredExtensions: ['.json', '.pdf'] //TODO: dit is dubbelop met de package-json. Even nadenken wat we willen
    }) {
        this.data = rawData.filter(c => !ignoredAuthors.includes(c.author));
    }

    concat(other: RepositoryStatistics): RepositoryStatistics {
        let combinedData = this.data.concat(other.data);
        return new RepositoryStatistics(combinedData, this.options);
    }

    #accumulateLines(acc: LinesStatistics, change: LoggedChange) {
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

    static #filterCommit(commit: LoggedCommit, extensions: string[]): LoggedCommit {
        function getChangesForGroup(changes: LoggedChange[]): LoggedChange[] {
            return changes.filter(c => extensions.some(ext => c.path.toLocaleLowerCase().endsWith(ext.toLocaleLowerCase())));
        }

        let changes: LoggedChange[] = getChangesForGroup(commit.changes);
        return {
            ...commit,
            changes
        }
    }

    #privGetCommitsPerWeek(someData: LoggedCommit[], startDate: Date = null, endDate: Date): LoggedCommit[][] {
        if (someData.length === 0) {
            return [];
        }
        let commits = someData.toSorted((a, b) => a.date.valueOf() - b.date.valueOf());
        let start = startDate || commits[0].date;
        let end = endDate || commits[commits.length - 1].date;

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
        while(nextDate <= end) {
            result.push([]);
            nextDate = RepositoryStatistics.#addWeek(nextDate);
        }
        return result;
    }

    mapAuthors(authorMapping: {[alias: string]: string}){
        this.data.forEach(commit => {
            if (authorMapping[commit.author]) {
                commit.author = authorMapping[commit.author];
            }
        });
    }

    getDistinctAuthors() {
        return [...new Set(this.data.map(c => c.author))];
    }
    
    getLinesTotal(): LinesStatistics {
        return RepositoryStatistics.#getChanges(this.data).reduce(this.#accumulateLines.bind(this), { added: 0, removed: 0 });
    }

    getDateRange(): { start: Date; end: Date; } {
        let start = new Date(Math.min(...this.data.map(stat => stat.date.getTime())));
        let end = new Date(Math.max(...this.data.map(stat => stat.date.getTime())));
        return { start, end };
    }

    groupByWeek(startDate: Date = null, endDate: Date = null): ExportingArray<RepositoryStatistics> {
        let stats: RepositoryStatistics[] = this.#privGetCommitsPerWeek(this.data, startDate, endDate)
            .map(cs => new RepositoryStatistics(cs, this.options))
        return new ExportingArray<RepositoryStatistics>(stats);
    }

    groupByAuthor(authors: string[]): GroupedCollection<RepositoryStatistics> {
        let result: { [name: string]: RepositoryStatistics } = {};
        for (let author of this.getDistinctAuthors()) {
            let authorCommits = this.data.filter(c => c.author === author);
            let authorResult = new RepositoryStatistics(authorCommits, this.options);
            result[author] = authorResult;
        }

        for (let author of authors) {
            if (!result[author]) {
                result[author] = new RepositoryStatistics([], this.options);
            }
        }
        return new GroupedCollection(result);
    }


    groupBy(groups: GroupDefinition[]): GroupedCollection<Statistics> {
        let result: { [name: string]: Statistics } = {};
        for (let group of groups) {
            if(!group.extensions){
                result[group.name] = new CombinedStats([]);
            }else{
                let groupCommits = [];
                for (let commit of this.data) {
                    let filteredCommit = RepositoryStatistics.#filterCommit(commit, group.extensions);
                    if (filteredCommit.changes.length > 0) {
                        groupCommits.push(filteredCommit);
                    }
    
                }
                let groupResult = new RepositoryStatistics(groupCommits, this.options);
                result[group.name] = groupResult;
            }            
        }

        return new GroupedCollection(result);
    }
}
