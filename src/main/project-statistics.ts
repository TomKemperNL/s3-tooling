import { Issue, PullRequest, Comment } from "../shared";
import { GroupedCollection, ExportingArray } from "./repository-statistics";

export class ProjectStatistics {

    
    constructor(private issues: Issue[], private prs: PullRequest[], private comments: Comment[] = []) {
        
    }

    groupByAuthor() : GroupedCollection<ProjectStatistics>{
        let results = {};
        function addOrAppend(type, key, value){
            if(!results[key]){
                results[key] = {
                    issues: [],
                    prs: [],
                    comments: []
                }
            }
            results[key][type].push(value);            
        }

        for(let i of this.issues){
            addOrAppend('issues', i.author, { ...i, comments: []});
            for(let c of i.comments){
                addOrAppend('comments', c.author, c);
            }
        }
        for(let pr of this.prs){
            addOrAppend('prs', pr.author, { ...pr, comments: []});
            for(let c of pr.comments){
                addOrAppend('comments', c.author, c);
            }
        }

        for(let author of Object.keys(results)){
            results[author] = new ProjectStatistics(
                results[author].issues, 
                results[author].prs,
                results[author].comments
            );
        }
        
        return new GroupedCollection<ProjectStatistics>(results);
    }

    static #getLines(carrier: Issue | PullRequest){
        let commentLines = carrier.comments
            .map(c => c.body.split("\n").length)
            .reduce((a,b)=> a+b, 0);
        return carrier.body.split("\n").length + (carrier.title ? 1 : 0) + commentLines;
    }

    getLines() : { lines: number} {
        let issueStats = this.issues.reduce((acc, issue) => {
            return {lines: acc.lines + ProjectStatistics.#getLines(issue)}
        }, {lines: 0});
        let prStats = this.prs.reduce((acc, pr) => {
            return {lines: acc.lines + ProjectStatistics.#getLines(pr)}
        }, { lines: 0});

        let commentStats = this.comments.reduce((acc, comment) => {
            return {lines: acc.lines + comment.body.split('\n').length}
        }, { lines: 0});

        let total = {
            lines: issueStats.lines + prStats.lines + commentStats.lines
        };
        return total;   
    }
}