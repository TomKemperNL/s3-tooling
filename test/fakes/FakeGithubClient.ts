export class FakeGithubClient {
    apiCalls = 0;
    repos = [];
    async listRepos(){
        this.apiCalls++;
        return this.repos;
    }

    members: {[repo: string]: {login: string}[]} = {};
    async getMembers(org: string, repo: string){
        this.apiCalls++;
        return this.members[repo];
    }

    async listIssues(org: string, repo: string) {
        this.apiCalls++;
        return [];
    }

    async listPullRequests(org: string, repo: string) {
        this.apiCalls++;
        return [];
    }
}