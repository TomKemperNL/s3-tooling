import { GithubClient } from "./github_client";
import { FileSystem } from "./filesystem_client";

const client = new GithubClient();
const fileSystem = new FileSystem();

export async function backup(org, options?) {
    let repos = await client.listRepos(org);

    repos.forEach(r => {
        try {
            fileSystem.cloneRepo(org, r);
        } catch (e) {
            console.error(e);
        }
    });
}