import { Database } from "sqlite3";
import fs from 'fs/promises';
import { feb2024, s2, s3 } from '../temp'
import { CourseConfig, CourseDTO, StudentDTO } from "../shared";
import { MemberResponse, RepoResponse } from "./github-client";
import { StringDict } from "./canvas-client";

type CourseDb = {
    canvasId: number,
    name: string,
    canvasGroups: string,
    canvasOverviewJson: string,
    startDate: string,
    githubStudentOrg: string,
    lastRepoCheck: string,
    lastSectionCheck: string,
    lastMappingCheck: string
}

type AssignmentDb = {
    courseId: number,
    githubAssignment: string,
    canvasId?: number,
    groupAssignment: 0 | 1
}

export type RepoDb = {
    organization: string,
    name: string,
    full_name: string,
    priv: boolean,
    html_url: string,
    ssh_url: string,
    api_url: string,
    created_at: string,
    updated_at: string,
    lastMemberCheck: string
}

function courseDbToConfig(r: CourseDb, as: AssignmentDb[]): CourseConfig {
    return {
        name: r.name,
        canvasId: r.canvasId,
        canvasGroupsName: r.canvasGroups,
        startDate: r.startDate ? new Date(Date.parse(r.startDate)) : null,
        githubStudentOrg: r.githubStudentOrg,
        canvasOverview: r.canvasOverviewJson ? JSON.parse(r.canvasOverviewJson) : [],
        assignments: as.map(a => ({
            canvasId: a.canvasId,
            name: a.githubAssignment,
            groupAssignment: a.groupAssignment === 1
        })),

        lastRepoCheck: r.lastRepoCheck ? new Date(Date.parse(r.lastRepoCheck)) : null,
        lastSectionCheck: r.lastSectionCheck ? new Date(Date.parse(r.lastSectionCheck)) : null,
        lastMappingCheck: r.lastMappingCheck ? new Date(Date.parse(r.lastMappingCheck)) : null
    }
}

export class Db {   
    #initializer: () => Database;
    #db: Database
    constructor(initializer: () => Database = null) {
        if (!initializer) {
            initializer = () => new Database('s3-tooling.sqlite3');
        }

        this.#initializer = initializer;
        this.#db = this.#initializer();
    }

    activeTransaction = false;

    async #inTransaction<T>(func: () => Promise<T | void>) {
        try {
            if (this.activeTransaction) {
                throw new Error("Nested transactions are not supported");
            }
            await this.#runProm("begin transaction;")
            this.activeTransaction = true;
            const result = await func();

            await this.#runProm("commit transaction;")
            this.activeTransaction = false;
            return result;
        } catch (e) {
            await this.#runProm("rollback transaction;")
            this.activeTransaction = false;
            throw e;
        }
    }

    async reset() {
        await this.delete();
        this.#db = this.#initializer();
        await this.initSchema();
        await this.initData();
    }

    async getCourseConfig(id: number): Promise<CourseConfig> {
        const r = await this.#getProm<CourseDb>("select * from courses where canvasId = ?;", id);
        const as = await this.#allProm<AssignmentDb>("select * from course_assignments where courseId = ?", id)
        if (r) {
            return courseDbToConfig(r, as);
        }
    }

    async getCourseConfigs(): Promise<CourseConfig[]> {
        const rows = await this.#allProm<CourseDb>("select * from courses;");
        const results: CourseConfig[] = rows.map(c => courseDbToConfig(c, [])); //hacky hackmans
        return results;
    }

    async addCourse(courseConfig: CourseConfig) {
        await this.#inTransaction(async () => {
            await this.#runProm(`insert into courses(
                name, startDate,
                canvasId, canvasGroups, canvasOverviewJson,
                githubStudentOrg)
                values(
                ?,?,
                ?,?,?,
                ?)`, [
                courseConfig.name, courseConfig.startDate?.toISOString(), 
                courseConfig.canvasId, courseConfig.canvasGroupsName, courseConfig.canvasOverview ? JSON.stringify(courseConfig.canvasOverview) : null,
                courseConfig.githubStudentOrg
            ]);

            for (const as of courseConfig.assignments) {
                await this.#runProm(`insert into course_assignments(
                    courseId, githubAssignment, canvasId, groupAssignment) values(
                    ?,?,?,?
                    )`, courseConfig.canvasId, as.name, as.canvasId, as.groupAssignment)
            }
        });


    }

    async getStudentById(studentId: number) {
        return this.#getProm<any>('select * from students where id = ?', [studentId]);
    }

    async getStudentByEmail(email: string) {
        return this.#getProm<any>('select * from students where email = ?', [email]);
    }

    async updateAuthorMapping(org: string, repo: string, mapping: StringDict) {
        await this.#inTransaction(async () => {
            for (const authorName of Object.keys(mapping)) {
                const username = mapping[authorName];
                await this.#runProm(
                    `insert into githubCommitNames(name, githubUsername, organization, repository)
                     values(?,?,?,?);`,
                     [authorName, username, org, repo]);
            };
        });
    }

    async getAuthorMapping(org: string, repo: string): Promise<StringDict> {
        const rows = await this.#allProm<{ name: string, githubUsername: string }>(`
            select name, githubUsername from githubCommitNames 
            where organization = ? and repository = ?`, [org, repo]);
        const result: { [key: string]: string } = {};
        for (const r of rows) {
            result[r.name] = r.githubUsername;
        }
        return result;
    }

    async getAuthorMappingOrg(org: string): Promise<{ [key: string]: string }> {
        const rows = await this.#allProm<{ name: string, githubUsername: string }>(`
            select name, githubUsername from githubCommitNames 
            where organization = ?`, [org]);
        const result: { [key: string]: string } = {};
        for (const r of rows) {
            result[r.name] = r.githubUsername;
        }
        return result;
    }

    async removeAliases(githubStudentOrg: string, name: string, aliases: { [canonical: string]: string[]; }) {
        await this.#inTransaction(async () => {
            for (const canonical of Object.keys(aliases)) {
                const aliasList = aliases[canonical];
                for (const alias of aliasList) {
                    await this.#runProm(
                        `delete from githubCommitNames where organization = ? and repository = ? and name = ? and githubUsername = ?;`,
                        [githubStudentOrg, name, alias, canonical]);
                }
            }
        });
    }

    async updateUserMapping(courseId: number, usermapping: StringDict) {
        await this.#inTransaction(async () => {
            for (const k of Object.keys(usermapping)) {
                const v = usermapping[k];
                const student = await this.getStudentByEmail(k);
                if (student) { //Canvas heeft soms ook een 'testcursist' die elke opdracht een inlevering doet, en dus in deze lijst komt...
                    await this.#runProm('insert into githubAccounts(username, studentId) values(?, ?) on conflict do nothing;', [v, student.id]);
                }
            };

            await this.#runProm("update courses set lastMappingCheck = ? where canvasid = ?", [new Date().toISOString(), courseId]);
        });
    }

    async getStudentMailToGHUserMapping(courseId: number): Promise<StringDict> {
        const rows = await this.#allProm<{ email: string, username: string }>(`
            select s.email, gha.username from courses c 
                join sections sec on c.canvasid = sec.courseId
                join students_sections ss on ss.sectionId = sec.id
                join students s on ss.studentid = s.id
                join githubAccounts gha on s.id = gha.studentId
                where c.canvasId = ?`, [courseId]);
        const result: StringDict = {};
        for (const r of rows) {
            result[r.email] = r.username;
        }
        return result;
    }

    async getGHUserToStudentMailMapping(courseId: number): Promise<StringDict> {
        const rows = await this.#allProm<{ email: string, username: string }>(`
            select s.email, gha.username from courses c 
                join sections sec on c.canvasid = sec.courseId
                join students_sections ss on ss.sectionId = sec.id
                join students s on ss.studentid = s.id
                join githubAccounts gha on s.id = gha.studentId
                where c.canvasId = ?`, [courseId]);
        const result: StringDict = {};
        for (const r of rows) {
            result[r.username] = r.email;
        }
        return result;
    }

    async selectReposByCourse(courseId: number): Promise<RepoResponse[]> {
        return (await this.#allProm<RepoDb>("select * from repositories where courseId = ?", [courseId])).map(r => ({
            name: r.name,
            full_name: r.full_name,
            private: r.priv,
            html_url: r.html_url,
            ssh_url: r.ssh_url,
            url: r.api_url,
            created_at: r.created_at,
            updated_at: r.updated_at,
            organization: { login: r.organization },
            lastMemberCheck: r.lastMemberCheck ? new Date(Date.parse(r.lastMemberCheck)) : null
        }));
    }

    async updateRepoMapping(courseId: number, repos: RepoResponse[]) {

        await this.#inTransaction(async () => {
            for (const repo of repos) {
                await this.#runProm(`
                    insert into repositories(
                        courseId, 
                        name, full_name, organization, priv,
                        html_url, ssh_url, api_url,
                        created_at, updated_at) values (
                        ?,
                        ?,?,?,?,
                        ?,?,?,
                        ?,?) on conflict do nothing;`,
                    courseId,
                    repo.name, repo.full_name, repo.full_name.split('/')[0], repo.private, //??? wellicht omdat de token anders aangevraagd is?
                    repo.html_url, repo.ssh_url, repo.url,
                    repo.created_at, repo.updated_at
                )
            }

            await this.#runProm('update courses set lastRepoCheck = ? where canvasid = ?', new Date().toISOString(), courseId);
        })
    }

    async updateCollaborators(organization: string, name: string, collaborators: MemberResponse[]) {
        await this.#inTransaction(async () => {
            await Promise.all(collaborators.map(async c => {
                await this.#runProm('insert into repository_members(organization, name, username) values(?,?,?) on conflict do nothing',
                    organization, name, c.login);
            }));

            await this.#runProm('update repositories set lastMemberCheck = ? where organization = ? and name = ?',
                new Date().toISOString(), organization, name)
        });
    }

    async getCollaborators(organization: string, name: string): Promise<MemberResponse[]> {
        const result = await this.#allProm<{ organization: string, name: string, username: string }>(
            'select organization, name, username from repository_members where organization = ? and name = ?', organization, name);
        return result.map(r => ({
            login: r.username
        }))
    }

    //TODO: uitzoeken hoe je dit netter promisified...
    #runProm(query: string, ...args: any[]): Promise<undefined | { lastID: number }> {
        return new Promise((resolve, reject) => {
            this.#db.run(query, ...args, function (err: Error) {
                if (err) { reject(err); } else {
                    if (this.lastID) {
                        resolve(this);
                    } else {
                        resolve(undefined);
                    }
                }
            });
        });
    }

    #execProm(query: string, ...args: any[]): Promise<void> {
        return new Promise((resolve, reject) => {
            this.#db.exec(query, ...args, function (err: Error) {
                if (err) { reject(err); } else {
                    resolve();
                }
            });
        });
    }

    #getProm<T>(query: string, ...args: any[]): Promise<T> {
        return new Promise((resolve, reject) => {
            this.#db.get(query, ...args, function (err: Error, result: T) {
                if (err) { reject(err); } else {
                    resolve(result);
                }
            });
        });
    }

    #allProm<T>(query: string, ...args: any[]): Promise<T[]> {
        return new Promise((resolve, reject) => {
            this.#db.all(query, ...args, function (err: Error, result: T[]) {
                if (err) { reject(err); } else {
                    resolve(result);
                }
            });
        });
    }

    async updateSections(courseDTO: CourseDTO) {
        const savedCourse = await this.getCourse(courseDTO.canvasId);

        await this.#inTransaction(async () => {
            await this.#runProm('delete from sections where courseId=?', [savedCourse.canvasId]);

            const sections = Object.keys(courseDTO.sections);

            async function insertSection(k: string) {
                const runResult = await this.#runProm('insert into sections(name, courseid) values (?,?)', [k, savedCourse.canvasId]);
                const sectionId = runResult.lastID
                async function upsertStudent(s: StudentDTO) {
                    const existingStudent = await this.#getProm('select * from students where id = ?', [s.studentId]);
                    if (existingStudent === undefined) {
                        await this.#runProm('insert into students(id, email, name) values(?,?,?) on conflict do nothing;', [s.studentId, s.email, s.name]);
                    }
                    await this.#runProm('insert into students_sections(studentId, sectionId) values(?,?);', [s.studentId, sectionId]);
                }
                await Promise.all(courseDTO.sections[k].map(upsertStudent.bind(this)));
            };
            await Promise.all(sections.map(insertSection.bind(this)));

            await this.#runProm('update courses set lastSectionCheck = ? where canvasId = ?', new Date().toISOString(), courseDTO.canvasId)
        });
    }

    async getCourse(canvasId: number) {
        const rows = await this.#allProm<any>(`
                select c.name as courseName, sec.name as sectionName, stu.name as studentName, stu.id as studentId, * from courses c 
                    left join sections sec on sec.courseId = c.canvasid
                    left join students_sections ss on ss.sectionId = sec.id
                    left join students stu on ss.studentId = stu.id
                    where c.canvasId = ?
                    order by sec.name
                `, [canvasId]);

        const as = await this.#allProm<AssignmentDb>("select * from course_assignments where courseId = ?", canvasId)

        const courseDTO: CourseDTO = {
            name: rows[0].courseName,
            canvasId: rows[0].canvasId,
            assignments: as.map(a => ({
                canvasId: a.canvasId,
                name: a.githubAssignment,
                groupAssignment: a.groupAssignment === 1
            })),
            sections: {}
        };

        for (const r of rows) {
            if (r.studentName) {
                if (!courseDTO.sections[r.sectionName]) {
                    courseDTO.sections[r.sectionName] = [];
                }
                courseDTO.sections[r.sectionName].push({
                    studentId: r.studentId,
                    name: r.studentName,
                    email: r.email
                });
            }
        }

        return courseDTO;
    }

    async exists(){
        try{
            await this.#getProm('select 1 from courses limit 1;');
            return true;
        }catch(e){
            return false;
        }
    }

    async initSchema() {
        const schema = await fs.readFile('./create_schema.sql', { encoding: 'utf-8' });
        await this.#execProm(schema);
    }

    async initData() {
        await this.addCourse(s2);
        await this.addCourse(s3);
        await this.addCourse(feb2024);
    }

    async delete() {
        return new Promise<void>((resolve, reject) => {
            this.#db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        }).then(() => {
            return fs.rm('s3-tooling.sqlite3');
        });
    }

    async test() {
        console.log(await this.#allProm('select * from courses'))
    }

    async close() {
        return new Promise<void>((resolve, reject) => {
            this.#db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}

export const db = new Db();
