import { LinesStatistics } from "../shared";
import { ProjectStatistics } from "./project-statistics";
import { RepositoryStatistics } from "./repository-statistics";

export interface StatsBuilderInitial {
    groupByWeek(startDate: Date, endDate: Date): StatsBuilderThenBy
    groupByAuthor(authors: string[]): StatsBuilderThenBy
    groupBy(groups: GroupDefinition[]): StatsBuilderThenBy
}

export interface StatsBuilderThenBy {
    thenByWeek(startDate: Date, endDate: Date): StatsBuilderThenBy
    thenByAuthor(authors: string[]): StatsBuilderThenBy
    thenBy(groups: GroupDefinition[]): StatsBuilderThenBy

    build(): any;
}

export class StatsBuilder implements StatsBuilderInitial, StatsBuilderThenBy {

    private wip: any;
    constructor(private stats: Statistics, wip: any = null) {
        if (!wip) {
            this.wip = stats;
        } else {
            this.wip = wip;
        }
    }

    groupByWeek(startDate: Date, endDate: Date): StatsBuilderThenBy {
        if (this.wip instanceof CombinedStats || this.wip instanceof RepositoryStatistics || this.wip instanceof ProjectStatistics) {
            return new StatsBuilder(this.stats, this.wip.groupByWeek(startDate, endDate));
        } else if (this.wip instanceof ExportingArray || this.wip instanceof GroupedCollection) {
            return new StatsBuilder(this.stats, this.wip.map(stat => stat.groupByWeek(startDate, endDate)));
        } else {
            throw new Error('Unsupported type for groupByWeek: ' + typeof this.wip);
        }
    }
    groupByAuthor(authors: string[]): StatsBuilderThenBy {
        if (this.wip instanceof CombinedStats || this.wip instanceof RepositoryStatistics || this.wip instanceof ProjectStatistics) {
            return new StatsBuilder(this.stats, this.wip.groupByAuthor(authors));
        } else if (this.wip instanceof ExportingArray || this.wip instanceof GroupedCollection) {
            return new StatsBuilder(this.stats, this.wip.map(stat => stat.groupByAuthor(authors)));
        } else {
            throw new Error('Unsupported type for groupByWeek: ' + typeof this.wip);
        }
    }
    groupBy(groups: GroupDefinition[]): StatsBuilderThenBy {
        if (this.wip instanceof CombinedStats || this.wip instanceof RepositoryStatistics || this.wip instanceof ProjectStatistics) {
            return new StatsBuilder(this.stats, this.wip.groupBy(groups));
        } else if (this.wip instanceof ExportingArray || this.wip instanceof GroupedCollection) {
            return new StatsBuilder(this.stats, this.wip.map(stat => stat.groupBy(groups)));
        } else {
            throw new Error('Unsupported type for groupByWeek: ' + typeof this.wip);
        }
    }
    thenByWeek(startDate: Date, endDate: Date = null): StatsBuilderThenBy {
        return this.groupByWeek(startDate, endDate);
    }
    thenByAuthor(authors: string[]): StatsBuilderThenBy {
        return this.groupByAuthor(authors);
    }
    thenBy(groups: GroupDefinition[]): StatsBuilderThenBy {
        return this.groupBy(groups);
    }

    static #deepOp(target: any, op: (a: Statistics) => any): any {
        if (target instanceof CombinedStats || target instanceof RepositoryStatistics || target instanceof ProjectStatistics) {
            return op(target);
        } else if (target instanceof ExportingArray || target instanceof GroupedCollection) {
            return target.map(inner => StatsBuilder.#deepOp(inner, op));
        } else {
            throw new Error('Unsupported type for deep operation: ' + typeof target);
        }
    }

    static #flatten(statObj: any): any {
        if (statObj instanceof CombinedStats || statObj instanceof RepositoryStatistics || statObj instanceof ProjectStatistics) {
            return statObj.getLinesTotal();
        }
        if (statObj instanceof ExportingArray || statObj instanceof GroupedCollection) {
            return statObj.map(StatsBuilder.#flatten).export();
        } else {
            throw new Error('Unsupported type for export: ' + typeof statObj);
        }
    }

    build(): any {
        return StatsBuilder.#flatten(this.wip);
    }

}

export interface Statistics {
    getDistinctAuthors(): string[];
    getLinesTotal(): LinesStatistics;
    getDateRange(): { start: Date, end: Date };

    groupByWeek(startDate: Date, endDate: Date): ExportingArray<Statistics>
    groupByAuthor(authors: string[]): GroupedCollection<Statistics>
    groupBy(groups: GroupDefinition[]): GroupedCollection<Statistics>;
}

export class CombinedStats implements Statistics {
    constructor(private stats: Statistics[]) {
    }
    getDistinctAuthors(): string[] {
        let authors = new Set<string>();
        for (let stat of this.stats) {
            for (let author of stat.getDistinctAuthors()) {
                authors.add(author);
            }
        }
        return [...authors];
    }

    getLinesTotal(): LinesStatistics {
        return this.stats.reduce((acc, stat) => {
            let lines = stat.getLinesTotal();
            acc.added += lines.added;
            acc.removed += lines.removed;
            return acc;
        }, { added: 0, removed: 0 });
    }

    getDateRange(): { start: Date; end: Date; } {
        let start = new Date(Math.min(...this.stats.map(stat => stat.getDateRange().start.getTime())));
        let end = new Date(Math.max(...this.stats.map(stat => stat.getDateRange().end.getTime())));
        return { start, end };
    }

    #group(grouper: (stat: Statistics) => GroupedCollection<Statistics>) {
        let tempResults: { [name: string]: Statistics[] } = {};
        let groupedResult = this.stats.reduce((acc, stat) => {
            let grouped = grouper(stat);
            for (let key of grouped.keys) {
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push(grouped.get(key));
            }
            return acc;
        }, tempResults);

        let result: { [name: string]: Statistics } = {};
        for (let key of Object.keys(groupedResult)) {
            result[key] = new CombinedStats(groupedResult[key]);
        }
        return new GroupedCollection<Statistics>(result);
    }

    groupByAuthor(authors: string[]): GroupedCollection<Statistics> {
        return this.#group(stat => stat.groupByAuthor(authors));
    }

    groupByWeek(startDate: Date, endDate: Date = null): ExportingArray<Statistics> {
        if (!endDate) {
            endDate = this.getDateRange().end;
        }
        let tempResults: Statistics[][] = [];
        let groupedResult = this.stats.reduce((acc, stat) => {
            let grouped = stat.groupByWeek(startDate, endDate);
            for (let ix = 0; ix < grouped.length; ix++) {
                if (!acc[ix]) {
                    acc[ix] = [];
                }
                let flattened = grouped.export();
                acc[ix].push(flattened[ix]);
            }
            return acc;
        }, tempResults);

        function mapper(arr?: Statistics[]): Statistics {
            if (!arr) {
                return new CombinedStats([]);
            }
            return new CombinedStats(arr);
        }

        return new ExportingArray(tempResults.map(mapper));
    }

    groupBy(groups: GroupDefinition[]): GroupedCollection<Statistics> {
        return this.#group(stat => stat.groupBy(groups));
    }
}

type RepoGroupDefinition = {
    name: string,
    extensions: string[]
}

type ProjectGroupDefinition = {
    name: string
    extensions: never
}

export type GroupDefinition =
    RepoGroupDefinition | ProjectGroupDefinition;

function isExportable(obj: any): obj is Exportable {
    return obj && typeof obj.export === 'function';
}
interface Exportable {
    export(): any;
}

//Dit moet vast handiger kunnen (want nu moet je elke array functie opnieuw implementeren)
export class GroupedCollection<T> {

    constructor(private content: { [name: string]: T }) {
    }

    get(name: string): T {
        return this.content[name];
    }

    get keys(): string[] {
        return Object.keys(this.content);
    }

    map<Y>(fn: (r: T) => Y): GroupedCollection<Y> {
        let result: { [name: string]: Y } = {};
        for (let key of Object.keys(this.content)) {
            result[key] = fn(this.content[key]);
        }

        return new GroupedCollection<Y>(result);
    }

    filter(fn: (groupName: string, r: T) => boolean): GroupedCollection<T> {
        let result: { [name: string]: T } = {};
        for (let key of Object.keys(this.content)) {
            if (fn(key, this.content[key])) {
                result[key] = this.content[key];
            }
        }
        return new GroupedCollection(result);
    }
    combine(other: GroupedCollection<T>, merger: (t1: T, t2: T) => T): GroupedCollection<T> {
        let result: { [name: string]: T } = {};
        for (let key of Object.keys(this.content)) {
            if (other.content[key]) {
                result[key] = merger(this.content[key], other.content[key]);
            } else {
                result[key] = this.content[key];
            }
        }
        for (let key of Object.keys(other.content)) {
            if (!this.content[key]) {
                result[key] = other.content[key];
            }
        }
        return new GroupedCollection(result);
    }

    //TODO: not sure hoe we dit moeten typen...
    export(): any {
        let result: { [name: string]: T } = {};
        for (let key of Object.keys(this.content)) {
            if (isExportable(this.content[key])) {
                result[key] = this.content[key].export();
            } else {
                result[key] = this.content[key];
            }
        }
        return result;
    }
}

export class ExportingArray<T> {
    constructor(private items: T[]) {

        // Object.setPrototypeOf(this, ExportingArray.prototype);
    }

    map<Y>(fn: (r: T) => Y): ExportingArray<Y> {
        let result = this.items.map(fn);
        return new ExportingArray(result);
    }

    filter(fn: (r: T) => boolean): ExportingArray<T> {
        let result = this.items.filter(fn);
        return new ExportingArray(result);
    }

    combine(other: ExportingArray<T>, merger: (t1: T, t2: T) => T): ExportingArray<T> {
        let result = [];
        for (let ix = 0; ix < Math.max(this.items.length, other.items.length); ix++) {
            if (this.items[ix] && other.items[ix]) {
                result.push(merger(this.items[ix], other.items[ix]));
            } else if (this.items[ix]) {
                result.push(this.items[ix]);
            } else if (other.items[ix]) {
                result.push(other.items[ix]);
            }
        }
        return new ExportingArray(result);
    }

    pad(length: number, value: T): ExportingArray<T> {
        let result = this.items.slice();
        while (result.length < length) {
            result.push(value);
        }
        return new ExportingArray(result);
    }

    get length() {
        return this.items.length;
    }

    export() {
        let result = [];
        for (let item of this.items) {
            if (isExportable(item)) {
                result.push(item.export());
            } else {
                result.push(item);
            }
        }
        return result;
    }

}