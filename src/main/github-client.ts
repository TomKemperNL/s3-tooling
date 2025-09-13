import { Octokit } from "@octokit/rest";
import { Issue, PullRequest, Repo } from "../shared";
import { response } from "express";

export type RepoResponse = {
    name: string,
    full_name: string,
    private: boolean,
    html_url: string,
    ssh_url: string,
    url: string,
    created_at: string,
    updated_at: string,
    organization: { login: string },
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
            // log: console
        });
    }

    async getSelf() {
        return this.#kit.request('GET /user').then(response => response.data);
    }

    
    createPr(org:string, repo: string, title: string, body: string, head: string, base: string) {
        return this.#kit.pulls.create({
            owner: org,
            repo: repo,
            title: title,
            body: body,
            head: head,
            base: base
        }).then(response => response.data);
    }

    async getMembers(org: string, repo: string): Promise<MemberResponse[]> {
      const teamsResponse = await this.#kit.repos.listTeams({
          repo: repo,
          owner: org
      });

      const members = await Promise.all(teamsResponse.data.map(team => this.#kit.teams.listMembersInOrg({
        org: org,
        team_slug: team.slug
      }))).then(responses => responses.flatMap(r => r.data));
      
      return members;
  }

    async listRepos(org: string): Promise<RepoResponse[]> {
        const pagination = this.#kit.paginate.iterator(this.#kit.repos.listForOrg,
            {
                per_page: 100,
                org: org
            }
        );

        let repos : RepoResponse[]= [];
        for await (const response of pagination) {
            repos = repos.concat(<any>response.data);
        }

        return repos;
    }

    async #fetchComments(issueId: string) : Promise<Comment[]> {
        let nextCursor = "";
        let hasNextPage = true;
        let comments : Comment[] = [];

        while (hasNextPage) {
            const response: any = await this.#kit.graphql(`
                query listComments($issueId: ID!, $cursor: String!) {
                  node(id: $issueId) {
                    ... on Issue {
                      comments(first: 100, after: $cursor) {
                        totalCount
                        pageInfo {
                          hasNextPage
                          endCursor
                        }
                        nodes {
                          author { login }
                          createdAt
                          body
                        }
                      }
                    }
                  }
                }`, {
                issueId, cursor: nextCursor
            });
            comments = comments.concat(response.node.comments.nodes);
            hasNextPage = response.node.comments.pageInfo.hasNextPage;
            nextCursor = response.node.comments.pageInfo.endCursor;
        }

        return comments;
    }

    cachedIssues: {[org: string]: { [repo: string]: Issue[] } } = {};

    async listIssues(org: string, repo: string) : Promise<Issue[]> {
        if( this.cachedIssues[org] && this.cachedIssues[org][repo]) {
            return this.cachedIssues[org][repo];
        }
        let nextCursor = "";
        let hasNextPage = true;
        let issues : any[] = [];

        while (hasNextPage) {
            const response: any = await this.#kit.graphql(`
                query listIssues($org: String!, $repo: String!, $cursor: String!) {
                  repository(owner: $org, name:$repo){
                    issues(first:50, after: $cursor){
                      totalCount 
                      pageInfo {
                        hasNextPage
                        endCursor
                      }
                      nodes{
                        id
                        title
                        body
                        createdAt
                        author { login }
                        comments(first:20) {
                          totalCount
                          pageInfo{
                            hasNextPage
                            endCursor            
                          }
                          nodes{
                            author { login }
                            createdAt
                            body
                          }
                        }
                      }
                    }
                  }
                }`, {
                org, repo, cursor: nextCursor
            });
            issues = issues.concat(response.repository.issues.nodes);
            hasNextPage = response.repository.issues.pageInfo.hasNextPage;
            nextCursor = response.repository.issues.pageInfo.endCursor;
        }

        const issuesWithLotsOfComments = issues.filter(issue => issue.comments.totalCount > 20);
        for (const issue of issuesWithLotsOfComments) {
            issue.comments.nodes = await this.#fetchComments(issue.id);
        }

        const result = issues.map(issue => ({
            ...issue,
            author: issue.author.login,
            createdAt: new Date(issue.createdAt),
            comments: issue.comments.nodes.map((comment: any) => ({
                ...comment,
                author: comment.author.login,
                createdAt: new Date(comment.createdAt),
            }))
        }));
        this.cachedIssues[org] = this.cachedIssues[org] || {};
        this.cachedIssues[org][repo] = result;
        return result;            
    }

    cachedPrs: {[org: string]: { [repo: string]: PullRequest[] } } = {};

    async listPullRequests(org: string, repo: string) {
        if( this.cachedPrs[org] && this.cachedPrs[org][repo]) {
            return this.cachedPrs[org][repo];
        }

        let nextCursor = "";
        let hasNextPage = true;
        let pullRequests : any[]= [];

        while (hasNextPage) {
            const response: any = await this.#kit.graphql(`
                query listPrs($org: String!, $repo: String!, $cursor: String!) {
                  repository(owner: $org, name:$repo){
                    pullRequests(first:50, after: $cursor){
                      totalCount 
                      pageInfo {
                        hasNextPage
                        endCursor
                      }
                      nodes{
                        id
                        title
                        body
                        createdAt
                        author { login }
                        comments(first:20) {
                          totalCount
                          pageInfo{
                            hasNextPage
                            endCursor            
                          }
                          nodes{
                            author { login }
                            createdAt
                            body
                          }
                        }
                      }
                    }
                  }
                }`, {
                org, repo, cursor: nextCursor
            });
            pullRequests = pullRequests.concat(response.repository.pullRequests.nodes);
            hasNextPage = response.repository.pullRequests.pageInfo.hasNextPage;
            nextCursor = response.repository.pullRequests.pageInfo.endCursor;
        }

        const pullRequestsWithLotsOfComments = pullRequests.filter(issue => issue.comments.totalCount > 20);
        for (const pullRequest of pullRequestsWithLotsOfComments) {
            pullRequest.comments.nodes = await this.#fetchComments(pullRequest.id);
        }

        const results = pullRequests.map(pullRequest => ({
            ...pullRequest,
            author: pullRequest.author.login,
            createdAt: new Date(pullRequest.createdAt),
            comments: pullRequest.comments.nodes.map((comment: any) => ({
                ...comment,
                author: comment.author.login,
                createdAt: new Date(comment.createdAt),
            }))
        })
        );            
        this.cachedPrs[org] = this.cachedPrs[org] || {};
        this.cachedPrs[org][repo] = results;
        return results;
    }

    clearCache(org: string, repo: string) {
        if (this.cachedIssues[org]) {
            delete this.cachedIssues[org][repo];
        }
        if (this.cachedPrs[org]) {
            delete this.cachedPrs[org][repo];
        }
    }

}