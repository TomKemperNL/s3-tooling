import { RepoResponse } from "../../../src/main/github-client";
import { Issue, PullRequest } from "../../../src/shared";

export class FakeGithubClient {
    apiCalls = 0;
    repos: any[] = [];
    async listRepos() : Promise<RepoResponse[]>{
        this.apiCalls++;
        return this.repos;
    }

    members: {[repo: string]: {login: string}[]} = {};
    async getMembers(org: string, repo: string){
        this.apiCalls++;
        return this.members[repo] || [];
    }

    issues: Issue[] = [];
    async listIssues(org: string, repo: string) : Promise<Issue[]> {
        this.apiCalls++;
        return this.issues;
    }

    pullRequests: PullRequest[] = [];
    async listPullRequests(org: string, repo: string) : Promise<PullRequest[]> {
        this.apiCalls++;
        return this.pullRequests;
    }
}