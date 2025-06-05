import { Issue, PullRequest } from "../shared";
import { GroupedCollection, ExportingArray } from "./repository-statistics";

export class ProjectStatistics {
    groupByAuthor() : GroupedCollection<ProjectStatistics>{
        
        let results = {};
        for(let i of this.issues){
            if(!results[i.author]){
                results[i.author] = {
                    issues: [i],
                    prs: []
                }
            }else{
                results[i.author].issues.push(i);
            }
        }
        for(let pr of this.prs){
            if(!results[pr.author]){
                results[pr.author] = {
                    issues: [],
                    prs: [pr]
                };
            }else{
                results[pr.author].prs.push(pr);
            }
        }

        for(let author of Object.keys(results)){
            results[author] = new ProjectStatistics(results[author].issues, results[author].prs);
        }
        
        return new GroupedCollection<ProjectStatistics>(results);
    }

    constructor(private issues: Issue[], private prs: PullRequest[]) {
        
    }

    getLines() : { lines: number} {
        let issueStats = this.issues.reduce((acc, issue) => {
            return {lines: acc.lines + issue.body.split("\n").length + 1 }
        }, {lines: 0});
        let prStats = this.prs.reduce((acc, pr) => {
            return {lines: acc.lines + pr.body.split("\n").length + 1 }
        }, { lines: 0});
        let total = {
            lines: issueStats.lines + prStats.lines
        };
        return total;   
    }
}