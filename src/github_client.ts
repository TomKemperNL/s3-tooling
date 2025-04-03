import { Octokit } from "@octokit/rest";

export class GithubClient {
    #kit = new Octokit({
        auth: process.env.ACCESS_TOKEN,
        userAgent: 'ict.hu.nl S3-Tools Dev',
        log: console
    });

    test() {
        this.#kit.request('GET /users/{username}', {
            username: 'TomKemperNL'
        }).then(response => {
            console.log(response.data);
        });
    }

    async listRepos(org) {
        let pagination = this.#kit.paginate.iterator(this.#kit.repos.listForOrg,
            {
                per_page: 100,
                org: org
            }
        );

        let repos = [];
        for await (const response of pagination) {
            repos = repos.concat(response.data);
        }

        return repos;
    }
}