import { Octokit } from "@octokit/rest";

export type RepoResponse = {
    id: number,
    name: string,
    full_name: string,
    private: boolean,
    html_url: string,
    ssh_url: string,
    url: string,
    created_at: string,
    updated_at: string,
}

export class GithubClient {
    #kit = new Octokit({
        auth: process.env.ACCESS_TOKEN,
        userAgent: 'ict.hu.nl S3-Tools Dev',
        log: console
    });

    async getSelf() {
        return this.#kit.request('GET /user').then(response => response.data);
    }

    async getMembers(org, repo) {
        let response = await this.#kit.repos.listCollaborators({
            repo: repo,
            owner: org
        });
        return response.data;
    }

    async listRepos(org) : Promise<RepoResponse[]> {        
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