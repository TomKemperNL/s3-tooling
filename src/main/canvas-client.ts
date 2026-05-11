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

export interface UserResponse {
    id: number;
    name: string;
    short_name: string;
    login_id: string;
};


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
    grader_id?: number,
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
    if (url.startsWith('https://github.com')) {
        const exp = `https://github.com/(.+?)/${assignmentName}-(.+)`;
        const match = url.match(exp);
        if (match && match.length > 2) {
            const username = match[2].replace('.git', '').split('/')[0];
            return username;
        }
    }

    //SSH url
    if (url.startsWith('git@github.com')) {
        const exp = `git@github.com:(.+?)/${assignmentName}-(.+)`;
        const match = url.match(exp);
        if (match && match.length > 2) {
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
        const data: any = await response.json();
        return {
            data: data,
            hasNext: hasNext
        };
    }

    async #getPages<T>(url: string, options = {}): Promise<T> {
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
        return this.#getPages('courses');
    }

    getSections(course: { course_id: number }): Promise<SectionResponse[]> {
        return this.#getPages(`courses/${course.course_id}/sections`, { 'include[]': 'students' });
    }

    async getGroups(course: { course_id: number }, category_name: string): Promise<GroupResponse[]> {
        const categories: any[] = await this.#getPages(`courses/${course.course_id}/group_categories`);
        const category = categories.find(c => c.name === category_name);
        if (!category) {
            throw new Error(`Category ${category_name} not found`);
        }
        const groups: any = await this.#getPages(`group_categories/${category.id}/groups`);
        for (const g of groups) {
            g.students = await this.#getPages(`groups/${g.id}/users`);
        }
        return groups;
    }

    assignmentCache: { [key: number]: AssignmentResponse[] } = {};

    async getAssignments(course: { course_id: number }): Promise<AssignmentResponse[]> {
        if (this.assignmentCache[course.course_id]) {
            return this.assignmentCache[course.course_id]; //todo: deep clonen
        }

        let result: AssignmentResponse[] = await this.#getPages(`courses/${course.course_id}/assignments`);
        this.assignmentCache[course.course_id] = result;
        return result;

    }

    async getSubmissions(params: { course_id: number, assignment_id: number, student_id: number }): Promise<any[]> {
        try {
            return this.#getPages(`courses/${params.course_id}/assignments/${params.assignment_id}/submissions/${params.student_id}`, { 'include[]': ['submission_comments', 'rubric_assessment'] });
        } catch (e) {
            console.log(`Error fetching submission for course ${params.course_id}, assignment ${params.assignment_id}, student ${params.student_id}: ${e}`);
            return [];
        }
    }

    async getUsers(params: { course_id: number }): Promise<StudentResponse[]> {
        return this.#getPages(`courses/${params.course_id}/users`);
    }

    async getUserByCanvasId(params: { course_id: number, user_id: number }): Promise<UserResponse> {
        return await this.#getPages(`courses/${params.course_id}/users/${params.user_id}`);
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

    submissionsCache: { [key: string]: SubmissionResponse[] } = {};


    async getAllSubmissionsForStudent(params: { course_id: number, student_id: number }): Promise<SubmissionResponse[]> {
        if (this.submissionsCache[`${params.course_id}-${params.student_id}`]) {
            return this.submissionsCache[`${params.course_id}-${params.student_id}`]; //todo: deep clonen
        }

        let assignments = await this.getAssignments({ course_id: params.course_id });
        let submisisonPs: Promise<any[]>[] = [];

        for (let assignment of assignments) {
            submisisonPs.push(this.getSubmissions({ course_id: params.course_id, assignment_id: assignment.id, student_id: params.student_id }));
        }

        let submissions = await Promise.all(submisisonPs);
        let result = submissions.flat();

        this.submissionsCache[`${params.course_id}-${params.student_id}`] = result;

        return result;
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
        const mapping: { [key: string]: string } = {};
        const result: any = await this.#getPages(`courses/${course.course_id}/assignments/${assignment.assignment_id}/submissions`, { 'include[]': 'user' });
        for (const r of result) {
            const user = r.user;
            if (user && user.login_id) {
                mapping[user.login_id] = getUsernameFromUrl(r.url, ghAssignmentName);
            }
        }
        return mapping;
    }
}


export class OptionalCanvasClient extends CanvasClient {
    constructor(canvasToken: string) {
        super(canvasToken || "invalid");
    }

    async getSelf() {
        try {
            return await super.getSelf();
        } catch (e) {
            console.error("Error fetching self, returning dummy user", e);
            return {
                id: -1,
                name: '-',
                short_name: '-',
                login_id: '-'
            };
        }
    }

    async getCourses() {
        try {
            return await super.getCourses();
        } catch (e) {
            console.error("Error fetching courses, returning empty list", e);
            return [];
        }
    }

    async getSections(course: { course_id: number }) {
        try {
            return await super.getSections(course);
        } catch (e) {
            console.error(`Error fetching sections for course ${course.course_id}, returning empty list`, e);
            return [];
        }
    }

    async getGroups(course: { course_id: number }, category_name: string) {
        try {
            return await super.getGroups(course, category_name);
        } catch (e) {
            console.error(`Error fetching groups for course ${course.course_id} and category ${category_name}, returning empty list`, e);
            return [];
        }
    }

    async getAssignments(course: { course_id: number }) {
        try {
            return await super.getAssignments(course);
        } catch (e) {
            console.error(`Error fetching assignments for course ${course.course_id}, returning empty list`, e);
            return [];
        }
    }

    async getSubmissions(params: { course_id: number, assignment_id: number, student_id: number }) {
        try {
            return await super.getSubmissions(params);
        } catch (e) {
            console.error(`Error fetching submissions for course ${params.course_id}, assignment ${params.assignment_id} and student ${params.student_id}, returning empty list`, e);
            return [];
        }
    }

    async getUsers(params: { course_id: number }) {
        try {
            return await super.getUsers(params);
        } catch (e) {
            console.error(`Error fetching users for course ${params.course_id}, returning empty list`, e);
            return [];
        }
    }

    async getUserByCanvasId(params: { course_id: number, user_id: number }) {
        try {
            return await super.getUserByCanvasId(params);
        } catch (e) {
            console.error(`Error fetching user by canvas id for course ${params.course_id} and user ${params.user_id}, returning dummy user`, e);
            return {
                id: -1,
                name: '-',
                short_name: '-',
                login_id: '-'
            };
        }
    }

    async getGithubMapping(course: { course_id: number }, assignment: { assignment_id: number }, ghAssignmentName: string) {
        try {
            return await super.getGithubMapping(course, assignment, ghAssignmentName);
        } catch (e) {
            console.error(`Error fetching github mapping for course ${course.course_id} and assignment ${assignment.assignment_id}, returning empty mapping`, e);
            return {};
        }
    }

    async getCalloutsForStudent(params: { course_id: number; student_id: number; }): Promise<{ author: string; comment: string; }[]> {
        try {
            return await super.getCalloutsForStudent(params);
        } catch (e) {
            console.error(`Error fetching callouts for student ${params.student_id} in course ${params.course_id}, returning empty list`, e);
            return [];
        }
    }

    async getAllSubmissionsForStudent(params: { course_id: number; student_id: number; }): Promise<SubmissionResponse[]> {
        try {
            return await super.getAllSubmissionsForStudent(params);
        } catch (e) {
            console.error(`Error fetching all submissions for student ${params.student_id} in course ${params.course_id}, returning empty list`, e);
            return [];
        }
    }
}