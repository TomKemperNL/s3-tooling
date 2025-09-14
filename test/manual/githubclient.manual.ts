import { GithubClient } from "../../src/main/github-client";
require('@dotenvx/dotenvx').config({path: ['.dev.env', '.env']})

let client = new GithubClient(process.env.ACCESS_TOKEN);

async function main() {

    let projects = ['s3-project-team-relentless']
    for(let p of projects) {
      console.log(p);
      let result = await client.getMembers('HU-SD-S3-studenten-S2526', p);      
      
      console.log(result);      
    }
    
}
main();