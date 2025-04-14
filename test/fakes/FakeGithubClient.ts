export class FakeGithubClient {

    repos = [];
    async listRepos(){
        return this.repos;
    }

    members: {[repo: string]: {login: string}[]} = {};
    async getMembers(org: string, repo: string){
        return this.members[repo];
    }
}