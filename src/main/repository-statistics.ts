import { LinesStatistics } from "../shared";
import { StringDict } from "./canvas-client";
import { LoggedChange, LoggedCommit } from "./filesystem-client";
import { CombinedStats, ExportingArray, GroupDefinition, GroupedCollection, Statistics } from "./statistics";

function partition<T>(array: T[], predicate: (value: T) => boolean): [T[], T[]] {
    return array.reduce((acc, item) => {
        if(predicate(item)) {
            acc[0].push(item);
        }else{
            acc[1].push(item);
        }            
        return acc;
    }, [[], []]);
}

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
        this.data = rawData;
    }

    concat(other: RepositoryStatistics): RepositoryStatistics {
        const combinedData = this.data.concat(other.data);
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

        const addInc = change.added === '-' ? 0 : change.added;
        const remInc = change.removed === '-' ? 0 : change.removed;
        return { added: acc.added + addInc, removed: acc.removed + remInc };
    }

    static #addWeek(date: Date) {
        const newDate = new Date(date);
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        return new Date(newDate.valueOf() + weekMs);
    }

    static #getChanges(data: LoggedCommit[]): LoggedChange[] {
        return data.reduce((acc, commit) => {
            return acc.concat(commit.changes);
        }, [])
    }

    #privGetCommitsPerWeek(someData: LoggedCommit[], startDate: Date = null, endDate: Date): LoggedCommit[][] {
        if (someData.length === 0) {
            return [];
        }
        const commits = someData.toSorted((a, b) => a.date.valueOf() - b.date.valueOf());
        const start = startDate || commits[0].date;
        const end = endDate || commits[commits.length - 1].date;

        const result = []
        let currentCommits = [];
        let nextDate = RepositoryStatistics.#addWeek(start);
        let index = 0;
        while (index < commits.length) {
            const c = commits[index];
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

    filterAuthors(authors: string[]): void {
        this.data = this.data.filter(c => authors.includes(c.author));
    }

    mapAuthors(authorMapping: StringDict){
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
        const start = new Date(Math.min(...this.data.map(stat => stat.date.getTime())));
        const end = new Date(Math.max(...this.data.map(stat => stat.date.getTime())));
        return { start, end };
    }

    groupByWeek(startDate: Date = null, endDate: Date = null): ExportingArray<RepositoryStatistics> {
        const stats: RepositoryStatistics[] = this.#privGetCommitsPerWeek(this.data, startDate, endDate)
            .map(cs => new RepositoryStatistics(cs, this.options))
        return new ExportingArray<RepositoryStatistics>(stats);
    }

    groupByAuthor(authors: string[]): GroupedCollection<RepositoryStatistics> {
        const result: { [name: string]: RepositoryStatistics } = {};
        for (const author of this.getDistinctAuthors()) {
            const authorCommits = this.data.filter(c => c.author === author);
            const authorResult = new RepositoryStatistics(authorCommits, this.options);
            result[author] = authorResult;
        }

        for (const author of authors) {
            if (!result[author]) {
                result[author] = new RepositoryStatistics([], this.options);
            }
        }
        return new GroupedCollection(result);
    }

    


    groupBy(groups: GroupDefinition[]): GroupedCollection<Statistics> {
        const intermediate: { [name: string]: LoggedCommit[] } = {};        
        const otherCommits = [];

        for(const commit of this.data){      
            const copyCommit = { ...commit, changes: [...commit.changes] }; // Maak een kopie van de commit om te voorkomen dat we de originele data aanpassen      
            for(const group of groups){
                if(group.extensions){
                    const [matchingChanges, nonMatchingChanges] = partition(copyCommit.changes, (c: LoggedChange) => group.extensions.some(ext => c.path.toLocaleLowerCase().endsWith(ext.toLocaleLowerCase())))
                    const filteredCommit = {
                        ...copyCommit,
                        changes: matchingChanges
                    };
                    if (filteredCommit.changes.length > 0) {
                        if (!intermediate[group.name]) {
                            intermediate[group.name] = [];
                        }
                        intermediate[group.name].push(filteredCommit);                        
                    }
                    copyCommit.changes = nonMatchingChanges;
                }
            }
            if(copyCommit.changes.length > 0){
                otherCommits.push(copyCommit);
            }
        }

        const result : Record<string, Statistics> = {};
        for(const group of groups){
            if (intermediate[group.name]) {
                result[group.name] = new RepositoryStatistics(intermediate[group.name], this.options);
            } else if (group.other) {
                result[group.name] = new RepositoryStatistics(otherCommits, this.options);                
            }
            else{
                result[group.name] = new RepositoryStatistics([], this.options);
            }
        }


        return new GroupedCollection(result);
    }
}
