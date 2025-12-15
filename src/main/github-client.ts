import { Octokit } from "@octokit/rest";
import { Issue, PullRequest, Repo, Comment } from "../shared";
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

function cloneIssues(issues: Issue[]): Issue[] {
  return issues.map(issue => ({
    ...issue,
    comments: issue.comments.map(comment => ({ ...comment }))
  }));
}
function clonePRs(prs: PullRequest[]): PullRequest[] {
  return prs.map(pr => ({
    ...pr,
    comments: pr.comments.map(comment => ({ ...comment }))
  }));
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
  ignoredAuthors: string[] = [];

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


  createPr(org: string, repo: string, title: string, body: string, head: string, base: string) {
    return this.#kit.pulls.create({
      owner: org,
      repo: repo,
      title: title,
      body: body,
      head: head,
      base: base
    }).then(response => response.data);
  }

  getMembers(org: string, repo: string): Promise<MemberResponse[]> {
    return this.getCollaborators(org, repo);
  }

  async getCollaborators(org: string, repo: string): Promise<MemberResponse[]> {
    const resp = await this.#kit.repos.listCollaborators({
      owner: org,
      repo: repo,
      per_page: 100
    });
    return resp.data
      .filter(member => this.ignoredAuthors.indexOf(member.login) === -1);
  }

  async listRepos(org: string): Promise<RepoResponse[]> {
    const pagination = this.#kit.paginate.iterator(this.#kit.repos.listForOrg,
      {
        per_page: 100,
        org: org
      }
    );

    let repos: RepoResponse[] = [];
    for await (const response of pagination) {
      repos = repos.concat(<any>response.data);
    }

    return repos;
  }

  async #fetchComments(issueId: string): Promise<Comment[]> {
    let nextCursor = "";
    let hasNextPage = true;
    let comments: Comment[] = [];

    while (hasNextPage) {
      try {
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
      }catch (e) {
        console.error("Error fetching comments for issue", issueId, e);
        break;
      }      
    }

    return comments.filter((comment: Comment) => this.ignoredAuthors.indexOf(comment.author) === -1);
  }

  cachedIssues: { [org: string]: { [repo: string]: Issue[] } } = {};

  async listIssues(org: string, repo: string): Promise<Issue[]> {
    if (this.cachedIssues[org] && this.cachedIssues[org][repo]) {
      return cloneIssues(this.cachedIssues[org][repo]);
    }
    let nextCursor = "";
    let hasNextPage = true;
    let issues: any[] = [];

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
    return result.filter(issue => this.ignoredAuthors.indexOf(issue.author) === -1);
  }

  cachedPrs: { [org: string]: { [repo: string]: PullRequest[] } } = {};

  async listPullRequests(org: string, repo: string) {
    if (this.cachedPrs[org] && this.cachedPrs[org][repo]) {
      return clonePRs(this.cachedPrs[org][repo]);
    }

    let nextCursor = "";
    let hasNextPage = true;
    let pullRequests: any[] = [];

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
    return results.filter(issue => this.ignoredAuthors.indexOf(issue.author) === -1);
  }

  clearCache(org: string, repo: string) {
    if (this.cachedIssues[org]) {
      delete this.cachedIssues[org][repo];
    }
    if (this.cachedPrs[org]) {
      delete this.cachedPrs[org][repo];
    }
  }


  async getPagesUrl(org: string, repo: string): Promise<string | null> {
    let pages = await this.#kit.repos.getPages({ owner: org, repo: repo });
    return pages.data.html_url
  }
}