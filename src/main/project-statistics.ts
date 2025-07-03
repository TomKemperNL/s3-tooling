import { Issue, PullRequest, Comment, LinesStatistics } from "../shared";
import { ExportingArray, GroupedCollection, Statistics } from "./statistics";

export class ProjectStatistics implements Statistics<ProjectStatistics> {
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

    getDistinctAuthors(): string[] {
        let authors = new Set<string>();
        for (let i of this.issues) {
            authors.add(i.author);
            for (let c of i.comments) {
                authors.add(c.author);
            }
        }
        for (let pr of this.prs) {
            authors.add(pr.author);
            for (let c of pr.comments) {
                authors.add(c.author);
            }
        }
        return Array.from(authors);
    }

    asGrouped(groupName: string) {
        return new GroupedCollection({ [groupName]: this });
    }

    groupByAuthor(): GroupedCollection<ProjectStatistics> {
        let results: { [name: string]: any } = {};
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

        for (let i of this.issues) {
            addOrAppend('issues', i.author, { ...i, comments: [] });
            for (let c of i.comments) {
                addOrAppend('comments', c.author, c);
            }
        }
        for (let pr of this.prs) {
            addOrAppend('prs', pr.author, { ...pr, comments: [] });
            for (let c of pr.comments) {
                addOrAppend('comments', c.author, c);
            }
        }

        for (let author of Object.keys(results)) {
            results[author] = new ProjectStatistics(
                results[author].issues,
                results[author].prs,
                results[author].comments
            );
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
        let issueStats = this.issues.reduce((acc, issue) => {
            return { lines: acc.lines + ProjectStatistics.#getLinesTotal(issue) }
        }, { lines: 0 });
        let prStats = this.prs.reduce((acc, pr) => {
            return { lines: acc.lines + ProjectStatistics.#getLinesTotal(pr) }
        }, { lines: 0 });

        let commentStats = this.comments.reduce((acc, comment) => {
            return { lines: acc.lines + comment.body.split('\n').length }
        }, { lines: 0 });

        let total = {
            added: issueStats.lines + prStats.lines + commentStats.lines,
            removed: 0
        };
        return total;
    }

    static #addWeek(date: Date) {
        let newDate = new Date(date);
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        return new Date(newDate.valueOf() + weekMs);
    }

    groupByWeek(beginDate?: Date): ExportingArray<ProjectStatistics> {
        let gathered = [];

        //Algoritmisch gaan we hiervan huilen...
        let earliestDate = Math.min(
            !!beginDate ? beginDate.valueOf() : new Date().valueOf(),
            Math.min(...this.issues.map(i => i.createdAt.valueOf())),
            Math.min(...this.prs.map(pr => pr.createdAt.valueOf())),
            Math.min(...this.comments.map(c => c.createdAt.valueOf()))
        );
        let lastDate = Math.max(
            Math.max(...this.issues.map(i => i.createdAt.valueOf())),
            Math.max(...this.prs.map(pr => pr.createdAt.valueOf())),
            Math.max(...this.comments.map(c => c.createdAt.valueOf()))
        );
        let startDate = new Date(earliestDate);
        let nextDate = ProjectStatistics.#addWeek(startDate);

        while (nextDate.valueOf() <= lastDate) {
            let weekIssues = this.issues.filter(i => i.createdAt >= startDate && i.createdAt < nextDate);
            let weekPrs = this.prs.filter(pr => pr.createdAt >= startDate && pr.createdAt < nextDate);
            let weekComments = this.comments.filter(c => c.createdAt >= startDate && c.createdAt < nextDate);

            gathered.push(new ProjectStatistics(weekIssues, weekPrs, weekComments));
            startDate = nextDate;
            nextDate = ProjectStatistics.#addWeek(startDate);
        }
        let weekIssues = this.issues.filter(i => i.createdAt >= startDate && i.createdAt < nextDate);
        let weekPrs = this.prs.filter(pr => pr.createdAt >= startDate && pr.createdAt < nextDate);
        let weekComments = this.comments.filter(c => c.createdAt >= startDate && c.createdAt < nextDate);


        gathered.push(new ProjectStatistics(weekIssues, weekPrs, weekComments));
        return new ExportingArray(gathered);
    }

}