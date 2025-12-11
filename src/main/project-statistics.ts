import { Issue, PullRequest, Comment, LinesStatistics } from "../shared";
import { CombinedStats, ExportingArray, GroupDefinition, GroupedCollection, Statistics } from "./statistics";

export class ProjectStatistics implements Statistics {
    constructor(private issues: Issue[], private prs: PullRequest[], private comments: Comment[] = []) {
        if (comments.length === 0) {
            this.comments = issues.reduce((acc, issue) => {
                return acc.concat(issue.comments);
            }, []);
            this.comments = prs.reduce((acc, pr) => {
                return acc.concat(pr.comments);
            }, this.comments);
        }
    }

    filterAuthors(authors: string[]): void {
        this.issues = this.issues.filter(i => authors.includes(i.author));
        this.issues.forEach(i => {
            i.comments = i.comments.filter(c => authors.includes(c.author));
        });
        this.prs = this.prs.filter(pr => authors.includes(pr.author));
        this.prs.forEach(pr => {
            pr.comments = pr.comments.filter(c => authors.includes(c.author));
        });
        this.comments = this.comments.filter(c => authors.includes(c.author));
    }

    getDistinctAuthors(): string[] {
        const authors = new Set<string>();
        for (const i of this.issues) {
            authors.add(i.author);
            for (const c of i.comments) {
                authors.add(c.author);
            }
        }
        for (const pr of this.prs) {
            authors.add(pr.author);
            for (const c of pr.comments) {
                authors.add(c.author);
            }
        }
        return Array.from(authors);
    }

    getDateRange(): { start: Date; end: Date; } {
        if(this.issues.length === 0 && this.prs.length === 0 && this.comments.length === 0){
            return { start: null, end: null };        
        }
        
        const start = new Date(Math.min(
            ...this.issues.map(i => i.createdAt.getTime()),
            ...this.prs.map(pr => pr.createdAt.getTime()),
            ...this.comments.map(c => c.createdAt.getTime())
        ));
        const end = new Date(Math.max(
            ...this.issues.map(i => i.createdAt.getTime()),
            ...this.prs.map(pr => pr.createdAt.getTime()),
            ...this.comments.map(c => c.createdAt.getTime())
        ));
        return { start, end };
    }


    groupBy(groups: GroupDefinition[]): GroupedCollection<Statistics> {
        const result: { [name: string]: Statistics } = {};
        for (const group of groups) {
            if(group.projectContent){
                result[group.name] = this; //TODO: splitsen van issues, prs en comments in losse groups
            }else{
                result[group.name] = new CombinedStats([]);
            }
        }

        return new GroupedCollection<Statistics>(result);
    }

    groupByAuthor(authors: string[]): GroupedCollection<ProjectStatistics> {
        const results: { [name: string]: any } = {};
        function addOrAppend<T>(type: string, key: string, value: T) {
            if (!results[key]) {
                results[key] = {
                    issues: [],
                    prs: [],
                    comments: []
                }
            }
            results[key][type].push(value);
        }

        for (const i of this.issues) {
            addOrAppend('issues', i.author, { ...i, comments: [] });
            for (const c of i.comments) {
                addOrAppend('comments', c.author, c);
            }
        }
        for (const pr of this.prs) {
            addOrAppend('prs', pr.author, { ...pr, comments: [] });
            for (const c of pr.comments) {
                addOrAppend('comments', c.author, c);
            }
        }

        for (const author of Object.keys(results)) {
            results[author] = new ProjectStatistics(                
                results[author].issues,
                results[author].prs,
                results[author].comments
            );
        }

        for(const requestedAuthor of authors){
            if (!results[requestedAuthor]) {
                results[requestedAuthor] = new ProjectStatistics([], [], []);
            }
        }

        return new GroupedCollection<ProjectStatistics>(results);
    }

    static #getLinesTotal(carrier: Issue | PullRequest) {
        return carrier.body.split("\n").length + (carrier.title ? 1 : 0);
    }

    mapAuthors(authorMapping: { [alias: string]: string }) {
        this.issues.forEach(issue => {
            if (authorMapping[issue.author]) {
                issue.author = authorMapping[issue.author];
            }
            issue.comments.forEach(comment => {
                if (authorMapping[comment.author]) {
                    comment.author = authorMapping[comment.author];
                }
            });
        });

        this.prs.forEach(pr => {
            if (authorMapping[pr.author]) {
                pr.author = authorMapping[pr.author];
            }
            pr.comments.forEach(comment => {
                if (authorMapping[comment.author]) {
                    comment.author = authorMapping[comment.author];
                }
            });
        });
    }

    getLinesTotal(): LinesStatistics {
        const issueStats = this.issues.reduce((acc, issue) => {
            return { lines: acc.lines + ProjectStatistics.#getLinesTotal(issue) }
        }, { lines: 0 });
        const prStats = this.prs.reduce((acc, pr) => {
            return { lines: acc.lines + ProjectStatistics.#getLinesTotal(pr) }
        }, { lines: 0 });

        const commentStats = this.comments.reduce((acc, comment) => {
            return { lines: acc.lines + comment.body.split('\n').length }
        }, { lines: 0 });

        const total = {
            added: issueStats.lines + prStats.lines + commentStats.lines,
            removed: 0
        };
        return total;
    }

    static #addWeek(date: Date) {
        const newDate = new Date(date);
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        return new Date(newDate.valueOf() + weekMs);
    }

    groupByWeek(beginDate?: Date, endDate?: Date): ExportingArray<ProjectStatistics> {
        const gathered = [];

        //Algoritmisch gaan we hiervan huilen...
        const earliestDate = Math.min(            
            Math.min(...this.issues.map(i => i.createdAt.valueOf())),
            Math.min(...this.prs.map(pr => pr.createdAt.valueOf())),
            Math.min(...this.comments.map(c => c.createdAt.valueOf()))
        );
        
        let lastDate = Math.max(            
            Math.max(...this.issues.map(i => i.createdAt.valueOf())),
            Math.max(...this.prs.map(pr => pr.createdAt.valueOf())),
            Math.max(...this.comments.map(c => c.createdAt.valueOf()))
        );
        if (endDate) {
            lastDate = endDate.valueOf();
        }

        let startDate = beginDate || new Date(earliestDate);
        let nextDate = ProjectStatistics.#addWeek(startDate);

        while (nextDate.valueOf() <= lastDate) {
            const weekIssues = this.issues.filter(i => i.createdAt >= startDate && i.createdAt < nextDate);
            const weekPrs = this.prs.filter(pr => pr.createdAt >= startDate && pr.createdAt < nextDate);
            const weekComments = this.comments.filter(c => c.createdAt >= startDate && c.createdAt < nextDate);

            gathered.push(new ProjectStatistics(weekIssues, weekPrs, weekComments));
            startDate = nextDate;
            nextDate = ProjectStatistics.#addWeek(startDate);
        }
        const weekIssues = this.issues.filter(i => i.createdAt >= startDate && i.createdAt < nextDate);
        const weekPrs = this.prs.filter(pr => pr.createdAt >= startDate && pr.createdAt < nextDate);
        const weekComments = this.comments.filter(c => c.createdAt >= startDate && c.createdAt < nextDate);


        gathered.push(new ProjectStatistics(weekIssues, weekPrs, weekComments));
        return new ExportingArray(gathered);
    }

}