import { LoggedCommit } from "../../src/main/filesystem-client";
import { Repo } from "../../src/shared";

export class FakeFileSystem{
    cloneRepo(paths: string[], repo: Repo) {
        return Promise.resolve();
    }

    commits: LoggedCommit[] = [];
    async getRepoStats(...paths: string[]) : Promise<LoggedCommit[]> {
        return this.commits;
    }
}