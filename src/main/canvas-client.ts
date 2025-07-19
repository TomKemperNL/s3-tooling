export interface CourseResponse {
    id: number;
    name: string;
    course_code: string;
}

export interface StudentResponse {
    id: number;
    name: string;
    sortable_name: string;
    short_name: string;
    sis_user_id: string;
    login_id: string;
}

export interface SectionResponse {
    id: number;
    name: string;
    course_id: number;
    students: StudentResponse[]
}

export interface GroupResponse {
    id: number;
    category_id: number;
    name: string;
    students: StudentResponse[]
}

type PageResponse<T> = {
    data: T[];
    hasNext: boolean;
}

export type SimpleDict = { [key: string]: string | number };
export type StringDict = { [key: string]: string };

function parseLinkHeader(header: string): SimpleDict {
    const links : {[key: string]: string} = {};
    const parts = header.split(',');
    for (const part of parts) {
        const section = part.split(';');
        if (section.length !== 2) continue;
        const url = section[0].replace(/<(.*)>/, '$1').trim();
        const rel = section[1].replace(/rel="(.*)"/, '$1').trim();
        links[rel] = url;
    }
    return links;
}

function formatQueryString(params: SimpleDict) {
    return Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
}

export function getUsernameFromName(repoName: string, assignmentName: string){
    return repoName.slice(assignmentName.length +1);
}

export function getUsernameFromUrl(url: string, assignmentName: string){
    if(!url){
        return null;
    }

    if(url.indexOf('github.com') === -1){
        return null;
    }

    //Https url
    if(url.startsWith('https://github.com')){
        const exp = `https\:\/\/github\.com\/(.+?)\/${assignmentName}-(.+)`;
        const match = url.match(exp);
        if(match && match.length > 2){ 
            let username = match[2].replace('.git', '').split('/')[0];
            return username;
        }
    }

    //SSH url
    if(url.startsWith('git@github.com')){
        const exp = `git\@github\.com\:(.+?)\/${assignmentName}-(.+)`;
        const match = url.match(exp);
        if(match && match.length > 2){ 
            let username = match[2].replace('.git', '').split('/')[0];
            return username;
        }
    }
    return null;
}

export class CanvasClient {
    #token: string;
    #baseUrl = "https://canvas.hu.nl/api/v1";

    constructor(canvasToken: string) {
        if(!canvasToken) {
            throw new Error("Canvas token is required");
        }
        this.#token = canvasToken;
    }

    async getSelf() {
        let response = await fetch(`${this.#baseUrl}/users/self`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${this.#token}`
            }
        });
        if (!response.ok) {
            throw new Error(`Error fetching self: ${response.statusText}`);
        }
        return await response.json();
    }

    async #getPage<T>(url: string, page: number, pageSize: number, otherOptions: SimpleDict = {}): Promise<PageResponse<T>> {
        let options = {
            page: page,
            per_page: pageSize,
            ...otherOptions
        };

        let response = await fetch(`${this.#baseUrl}/${url}?${formatQueryString(options)}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${this.#token}`
            }
        });
        if (!response.ok) {
            throw new Error(`Error fetching ${url}: ${response.statusText}`);
        }
        let linkHeader = response.headers.get('link');
        let links = linkHeader ? parseLinkHeader(linkHeader) : {};
        let hasNext = links['next'] !== undefined;
        let isLast = links['last'] === links['current'];
        if (hasNext && isLast) {
            hasNext = false;
        }
        let data : any = await response.json();
        return {
            data: data,
            hasNext: hasNext
        };
    }

    async getPages<T>(url: string, options = {}): Promise<T> {
        let pageNr = 1;
        let page = await this.#getPage(url, pageNr, 100, options);
        let data: any = page.data;
        while (page.hasNext) {
            pageNr++;
            page = await this.#getPage(url, pageNr, 100, options);
            data = data.concat(page.data);
        }

        return data;
    }

    getCourses(): Promise<CourseResponse[]> {
        return this.getPages('courses');
    }

    getSections(course: { course_id: number }): Promise<SectionResponse[]> {
        return this.getPages(`courses/${course.course_id}/sections`, { 'include[]': 'students' });
    }

    async getGroups(course: { course_id: number }, category_name: string): Promise<GroupResponse[]> {
        let categories : any[] = await this.getPages(`courses/${course.course_id}/group_categories`);
        let category = categories.find(c => c.name === category_name);
        if (!category) {
            throw new Error(`Category ${category_name} not found`);
        }
        let groups : any = await this.getPages(`group_categories/${category.id}/groups`);
        for(let g of groups){
            g.students = await this.getPages(`groups/${g.id}/users`);
        }
        return groups;
    }


    async getGithubMapping(course: { course_id: number }, assignment: { assignment_id: number }, ghAssignmentName: string): Promise<StringDict> {
        let mapping : {[key: string]: string} = {};
        let result: any = await this.getPages(`courses/${course.course_id}/assignments/${assignment.assignment_id}/submissions`, { 'include[]': 'user' });
        for (let r of result) {
            let user = r.user;
            if (user && user.login_id) {
                mapping[user.login_id] = getUsernameFromUrl(r.url, ghAssignmentName);
            }
        }
        return mapping;
    }
}