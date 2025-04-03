import { GithubClient } from "./github_client";
import { FileSystem } from "./filesystem_client";

const client = new GithubClient();
const fileSystem = new FileSystem();

export async function backup(org, options?) {
    let repos = await client.listRepos(org);

    console.log(repos.map(repo => repo.name));

    repos.forEach(r => {
        try {
            fileSystem.cloneRepo(org, r);
        } catch (e) {
            console.error(e);
        }
    });
}

if (require.main === module) {
    console.log(process.env.ACCESS_TOKEN);
    console.log(process.argv.slice(2));

    backup('huict')
}