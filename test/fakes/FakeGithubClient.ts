export class FakeGithubClient {

    repos = [];
    async listRepos(){
        return this.repos;
    }
}