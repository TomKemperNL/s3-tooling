import { Octokit } from "@octokit/rest";
console.log("Using token", process.env.GITHUB_TOKEN);

let client = new Octokit({
    auth: process.env.GITHUB_TOKEN,
});

async function main() {
    let result = await client.graphql({
        query: `
            query {
  repository(name:"sd-s2-project-spaid-s", owner:"HU-SD-S2-studenten-2425"){
   	issues(first:45
    ){
      totalCount
      pageInfo{
        endCursor
        hasNextPage
      }
      nodes{
        author{
          login
        },
        title,
        url,
        createdAt,
        closedAt,
        body,
        state,
        comments(first:5) {
          totalCount
          pageInfo{
            endCursor
            hasNextPage
          }
          nodes{
            author { login },
            body
          }          
        }
      }     
    }
  }
}
    `});
    console.log(result);
}
main();




let someotherquery = `
{
  organization(login: "HU-SD-S2-studenten-2425") {
    projectsV2(first: 100) {
      nodes {
        title
        number
        items(first:10){
          nodes{
            type
            content{
              ... on PullRequest {
                title
                author { login }
                body
                prstate: state
                commits {
                  nodes{
                    commit{
                      author { name, email}
                      additions
                      deletions
                      message
                      
                    }
                  }
                }
              }
              ... on Issue {
                title
                author { login }
                body
                issuestate: state
                issueType{ name }
                labels {
                  nodes{
                    name
                  }
                }
                
              }
            }
          }
        }
        views(first: 10){
          nodes{
            name
            
          }
        }
      }
    }
  }
}`