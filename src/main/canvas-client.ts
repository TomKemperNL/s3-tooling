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

export interface RubricResponse {
    id: string,
    points: number,
    description: string,
    long_description: string,
    ratings: { points: number, description: string, long_description: string }[];    
}

export interface AssignmentResponse {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
    due_at: string;
    locked_at: string;
    rubric?: RubricResponse[];
}

export interface SubmissionCommentResponse {
    id: number;
    author_id: number;
    author_name: string;
    comment: string;
    created_at: string;
}

export interface SubmissionResponse {
    id: number,
    assignment_id: number,
    user_id: number,
    submitted_at: string,
    rubric_assessment?: { [key: string]: { points: number, comments: string } },
    submission_comments: SubmissionCommentResponse[],
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
    const links: { [key: string]: string } = {};
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
    function formatValue(key: string, value: string | number | string[] | number[]) {
        if (Array.isArray(value)) {
            return value.map(v => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`).join('&');
        } else {
            return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        }
    }

    return Object.entries(params)
        .map(([key, value]) => formatValue(key, value))
        .join('&');
}

export function getUsernameFromName(repoName: string, assignmentName: string) {
    return repoName.slice(assignmentName.length + 1);
}

export function getUsernameFromUrl(url: string, assignmentName: string) {
    if (!url) {
        return null;
    }

    if (url.indexOf('github.com') === -1) {
        return null;
    }

    //Https url
    if(url.startsWith('https://github.com')){
        const exp = `https://github.com/(.+?)/${assignmentName}-(.+)`;
        const match = url.match(exp);
        if(match && match.length > 2){ 
            const username = match[2].replace('.git', '').split('/')[0];
            return username;
        }
    }

    //SSH url
    if(url.startsWith('git@github.com')){
        const exp = `git@github.com:(.+?)/${assignmentName}-(.+)`;
        const match = url.match(exp);
        if(match && match.length > 2){
            const username = match[2].replace('.git', '').split('/')[0];
            return username;
        }
    }
    return null;
}

export class CanvasClient {
    #token: string;
    #baseUrl = "https://canvas.hu.nl/api/v1";

    constructor(canvasToken: string) {
        if (!canvasToken) {
            throw new Error("Canvas token is required");
        }
        this.#token = canvasToken;
    }

    async getSelf() {
        const response = await fetch(`${this.#baseUrl}/users/self`, {
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
        const options = {
            page: page,
            per_page: pageSize,
            ...otherOptions
        };

        const response = await fetch(`${this.#baseUrl}/${url}?${formatQueryString(options)}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${this.#token}`
            }
        });
        if (!response.ok) {
            throw new Error(`Error fetching ${url}: ${response.statusText}`);
        }
        const linkHeader = response.headers.get('link');
        const links = linkHeader ? parseLinkHeader(linkHeader) : {};
        let hasNext = links['next'] !== undefined;
        const isLast = links['last'] === links['current'];
        if (hasNext && isLast) {
            hasNext = false;
        }
        const data : any = await response.json();
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
        const categories : any[] = await this.getPages(`courses/${course.course_id}/group_categories`);
        const category = categories.find(c => c.name === category_name);
        if (!category) {
            throw new Error(`Category ${category_name} not found`);
        }
        const groups : any = await this.getPages(`group_categories/${category.id}/groups`);
        for(const g of groups){
            g.students = await this.getPages(`groups/${g.id}/users`);
        }
        return groups;
    }

    async getAssignments(course: { course_id: number }): Promise<AssignmentResponse[]> {
        return this.getPages(`courses/${course.course_id}/assignments`);
    }

    async getSubmissions(params: { course_id: number, assignment_id: number, student_id: number }): Promise<any[]> {
        try {
            return this.getPages(`courses/${params.course_id}/assignments/${params.assignment_id}/submissions/${params.student_id}`, { 'include[]': ['submission_comments', 'rubric_assessment'] });
        } catch (e) {
            console.log(`Error fetching submission for course ${params.course_id}, assignment ${params.assignment_id}, student ${params.student_id}: ${e}`);
            return [];
        }
    }

    async getUsers(params: { course_id: number }): Promise<StudentResponse[]> {
        return this.getPages(`courses/${params.course_id}/users`);
    }

    // Performance too shitty
    // async getAllSubmissions(params: { course_id: number }) {
    //     let studentsP = this.getUsers({ course_id: params.course_id });
    //     let assignmentsP = this.getAssignments({ course_id: params.course_id });
    //     let [students, assignments] = await Promise.all([studentsP, assignmentsP]);
    //     let submisisonPs: Promise<any[]>[] = [];
    //     for (let student of students) {
    //         for (let assignment of assignments) {
    //             submisisonPs.push(this.getSubmissions({ course_id: params.course_id, assignment_id: assignment.id, student_id: student.id }));
    //         }
    //     }
    //     let submissions = await Promise.all(submisisonPs);
    //     return submissions.flat();
    // }

    async getAllSubmissionsForStudent(params: { course_id: number, student_id: number }) : Promise<SubmissionResponse[]> {        
        let assignments = await this.getAssignments({ course_id: params.course_id });        
        let submisisonPs: Promise<any[]>[] = [];

        for (let assignment of assignments) {
            submisisonPs.push(this.getSubmissions({ course_id: params.course_id, assignment_id: assignment.id, student_id: params.student_id }));
        }

        let submissions = await Promise.all(submisisonPs);
        return submissions.flat();
    }

    async getCalloutsForStudent(params: { course_id: number, student_id: number }) {
        let subs = await this.getAllSubmissionsForStudent({ course_id: params.course_id, student_id: params.student_id });
        let comments = subs.flatMap(s => s.submission_comments);
        let commentsWithCallouts = comments.filter(c => c.comment && c.comment.indexOf('@') !== -1).map(c => ({
            author: c.author_name,
            comment: c.comment
        }));
        return commentsWithCallouts;
    }

    async getGithubMapping(course: { course_id: number }, assignment: { assignment_id: number }, ghAssignmentName: string): Promise<StringDict> {
        const mapping : {[key: string]: string} = {};
        const result: any = await this.getPages(`courses/${course.course_id}/assignments/${assignment.assignment_id}/submissions`, { 'include[]': 'user' });
        for (const r of result) {
            const user = r.user;
            if (user && user.login_id) {
                mapping[user.login_id] = getUsernameFromUrl(r.url, ghAssignmentName);
            }
        }
        return mapping;
    }
}