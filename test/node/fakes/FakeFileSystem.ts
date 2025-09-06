import { LoggedCommit } from "../../../src/main/filesystem-client";
import { Repo } from "../../../src/shared";

export class FakeFileSystem{
    cloneRepo(paths: string[], repo: Repo) {
        return Promise.resolve();
    }

    commits: LoggedCommit[] = [];
    blame: Record<string, Record<string, number>> = {};
    async getRepoStats(...paths: string[]) : Promise<LoggedCommit[]> {
        return this.commits;
    }

    async getLinesByGroupThenAuthor() : Promise<Record<string, Record<string, number>>>{
        return this.blame;
    }
}