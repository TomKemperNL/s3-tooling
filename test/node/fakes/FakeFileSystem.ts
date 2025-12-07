import { LoggedCommit } from "../../../src/main/filesystem-client";
import { GroupAuthorPie } from "../../../src/main/pie";
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

    async getLinesByGroupThenAuthor() : Promise<GroupAuthorPie>{
        return new GroupAuthorPie(this.blame);
    }
}