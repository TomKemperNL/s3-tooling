import { Octokit } from "@octokit/rest";
import { Repo } from "../shared";

export type RepoResponse = {
    name: string,
    full_name: string,
    private: boolean,
    html_url: string,
    ssh_url: string,
    url: string,
    created_at: string,
    updated_at: string,
    organization: { login: string},
    lastMemberCheck: Date
}

export function toRepo(repoResponse: RepoResponse): Repo {
    return new Repo(
        repoResponse.name,
        repoResponse.full_name.split('/')[0], // Organization is the first part of full_name
        repoResponse.url,
        repoResponse.ssh_url,
        repoResponse.html_url,
        repoResponse.lastMemberCheck);
}

export type MemberResponse = {
    login: string
}

export class GithubClient {
    #kit: Octokit;

    constructor(githubToken: string) {
        if (!githubToken) {
            throw new Error('Github token is required');
        }
        this.#kit = new Octokit({
            auth: githubToken,
            userAgent: 'ict.hu.nl:S3-Tools:Dev',
            log: console
        });
    }

    async getSelf() {
        return this.#kit.request('GET /user').then(response => response.data);
    }

    async getMembers(org, repo) : Promise<MemberResponse[]>{
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