import { GithubClient } from "../../src/main/github-client";
console.log("Using token", process.env.GITHUB_TOKEN);

let client = new GithubClient(process.env.GITHUB_TOKEN);

async function main() {

    let projects = ['sd-s2-project-1-team-1-taak',
'sd-s2-project-all4positivity',
'sd-s2-project-alt-f4']
    for(let p of projects) {
      console.log(p);
      let result = await client.listIssues('HU-SD-S2-studenten-2425', p);      
      console.log(result.length, "issues found");
      console.log(result.reduce((acc, issue) => {
        return acc + issue.comments.length;
      }, 0));

      
      let prs = await client.listPullRequests('HU-SD-S2-studenten-2425', p);      
      console.log(prs.length, "prs found");
      console.log(prs.reduce((acc, pr) => {
        return acc + pr.comments.length;
      }, 0));
      console.log(result);
    }
    
}
main();