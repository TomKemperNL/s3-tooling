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

    async getMembers(org, repo): Promise<MemberResponse[]> {
        let response = await this.#kit.repos.listCollaborators({
            repo: repo,
            owner: org
        });
        return response.data;
    }

    async listRepos(org): Promise<RepoResponse[]> {
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

    async #fetchComments(issueId: string) {
        let nextCursor = "";
        let hasNextPage = true;
        let comments = [];

        while (hasNextPage) {
            let response: any = await this.#kit.graphql(`
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


    async listIssues(org, repo) {
        let nextCursor = "";
        let hasNextPage = true;
        let issues = [];

        while (hasNextPage) {
            let response: any = await this.#kit.graphql(`
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

        let issuesWithLotsOfComments = issues.filter(issue => issue.comments.totalCount > 20);
        for (let issue of issuesWithLotsOfComments) {
            issue.comments.nodes = await this.#fetchComments(issue.id);
        }

        return issues.map(issue => ({
            ...issue,
            author: issue.author.login,
            comments: issue.comments.nodes.map(comment => ({
                ...comment,
                author: comment.author.login
            }))
        })
        );            
    }

    async listPullRequests(org, repo) {
        let nextCursor = "";
        let hasNextPage = true;
        let pullRequests = [];

        while (hasNextPage) {
            let response: any = await this.#kit.graphql(`
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

        let pullRequestsWithLotsOfComments = pullRequests.filter(issue => issue.comments.totalCount > 20);
        for (let pullRequest of pullRequestsWithLotsOfComments) {
            pullRequest.comments.nodes = await this.#fetchComments(pullRequest.id);
        }

        return pullRequests.map(pullRequest => ({
            ...pullRequest,
            author: pullRequest.author.login,
            comments: pullRequest.comments.nodes.map(comment => ({
                ...comment,
                author: comment.author.login
            }))
        })
        );            
    }
}