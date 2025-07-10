import { LinesStatistics } from "../shared";

export interface Statistics {
    getDistinctAuthors(): string[];

    groupByAuthor(): GroupedCollection<Statistics>    
    groupByWeek(startDate: Date): ExportingArray<Statistics> 
    groupByAuthor(): GroupedCollection<Statistics>    
    getLinesTotal(): LinesStatistics;
    groupBySubject(): GroupedCollection<Statistics>;
}

export type GroupDefinition = {
    name: string,
    extensions: string[]
}

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
    export() : any{
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