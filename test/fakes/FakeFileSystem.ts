import { Repo } from "../../src/core";

export class FakeFileSystem{
    cloneRepo(paths: string[], repo: Repo) {
        return Promise.resolve();
    }
}