import { Database } from "sqlite3";
import fs from 'fs/promises';
import { s2 } from '../temp'
import { CourseConfig, CourseDTO, RepoDTO } from "../core";
import { MemberResponse, RepoResponse } from "./github_client";
import { SimpleDict } from "./canvas_client";

type CourseDb = {
    id: number,
    name: string,
    canvasId: number,
    canvasVerantAssignmentId: number,
    canvasGroups: string,
    githubStudentOrg: string,
    githubVerantAssignment: string,
    githubProjectAssignment: string
    lastRepoCheck: string,
    lastSectionCheck: string,
    lastMappingCheck: string
}

export type RepoDb = {
    githubId: number,
    name: string,
    full_name: string,
    priv: boolean,
    html_url: string,
    ssh_url: string,
    api_url: string,
    created_at: string,
    updated_at: string,
    organization: string,
    lastMemberCheck: string
}

function courseDbToConfig(r: CourseDb): CourseConfig {
    return {
        name: r.name,
        canvasCourseId: r.canvasId,
        canvasVerantwoordingAssignmentId: r.canvasVerantAssignmentId,
        canvasGroupsName: r.canvasGroups,

        githubStudentOrg: r.githubStudentOrg,
        verantwoordingAssignmentName: r.githubVerantAssignment,
        projectAssignmentName: r.githubProjectAssignment,

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

    async #inTransaction<T>(func: () => Promise<T | void>) {
        try {
            await this.#runProm("begin transaction;")

            let result = await func();

            await this.#runProm("commit transaction;")

            return result;
        } catch (e) {
            await this.#runProm("rollback transaction;")
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
        let r = await this.#getProm<CourseDb>("select * from courses where canvasId = ?;", [id]);
        if (r) {
            return courseDbToConfig(r);
        }
    }

    async getCourseConfigs(): Promise<CourseConfig[]> {
        let rows = await this.#allProm<CourseDb>("select * from courses;");
        let results: CourseConfig[] = rows.map(courseDbToConfig);
        return results;
    }

    async addCourse(courseConfig: CourseConfig) {
        return this.#runProm(`insert into courses(
                name, 
                canvasId, canvasVerantAssignmentId, canvasGroups,
                githubStudentOrg, githubVerantAssignment, githubProjectAssignment)
                values(
                ?,
                ?,?,?,
                ?,?,?)`, [
            courseConfig.name,
            courseConfig.canvasCourseId, courseConfig.canvasVerantwoordingAssignmentId, courseConfig.canvasGroupsName,
            courseConfig.githubStudentOrg, courseConfig.verantwoordingAssignmentName, courseConfig.projectAssignmentName
        ]);
    }

    async getStudentById(studentId: number) {
        return this.#getProm<any>('select * from students where id = ?', [studentId]);
    }

    async getStudentByEmail(email: string) {
        return this.#getProm<any>('select * from students where email = ?', [email]);
    }

    async updateUserMapping(courseId: number, usermapping: { [key: string]: string | number; }) {
        await this.#inTransaction(async () => {
            for (let k of Object.keys(usermapping)) {
                let v = usermapping[k];
                let student = await this.getStudentByEmail(k);
                if (student) { //Canvas heeft soms ook een 'testcursist' die elke opdracht een inlevering doet, en dus in deze lijst komt...
                    await this.#runProm('insert into githubAccounts(username, studentId) values(?, ?) on conflict do nothing;', [v, student.id]);
                }
            };

            await this.#runProm("update courses set lastMappingCheck = ? where canvasid = ?", [new Date().toISOString(), courseId]);
        });
    }

    async getUserMapping(courseId: number) : Promise<SimpleDict> {
        let rows = await this.#allProm<{email: string, username: string}>(`
            select s.email, gha.username from courses c 
                join sections sec on c.canvasid = sec.courseId
                join students_sections ss on ss.sectionId = sec.id
                join students s on ss.studentid = s.id
                join githubAccounts gha on s.id = gha.studentId
                where c.canvasId = ?`, [courseId]);
        let result = {};                 
        for (let r of rows){
            result[r.email] = r.username;
        }
        return result;
    }

    async selectReposByCourse(courseId: number): Promise<RepoResponse[]> {
        return (await this.#allProm<RepoDb>("select * from repositories where courseId = ?", [courseId])).map(r => ({
            id: r.githubId,
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

        await this.#inTransaction(async ()=> {
            for (let repo of repos) {
                await this.#runProm(`
                    insert into repositories(
                        githubId, courseId, 
                        name, full_name, organization, priv,
                        html_url, ssh_url, api_url,
                        created_at, updated_at) values (
                        ?,?,
                        ?,?,?,?,
                        ?,?,?,
                        ?,?) on conflict do nothing;`, [
                            repo.id, courseId, 
                            repo.name, repo.full_name, repo.organization?.login, repo.private,
                            repo.html_url, repo.ssh_url, repo.url,
                            repo.created_at, repo.updated_at
                        ])
            }

            await this.#runProm('update courses set lastRepoCheck = ? where canvasid = ?', new Date().toISOString(), courseId);
        })
    }

    async updateCollaborators(githubId: number, collaborators: MemberResponse[]) {
        
        await this.#inTransaction(async () => {
            await Promise.all(collaborators.map(async c => {
                await this.#runProm('insert into repository_members(githubId, username) values(?,?) on conflict do nothing', [githubId, c.login]);
            }));

            await this.#runProm('update repositories set lastMemberCheck = ? where githubId = ?', new Date().toISOString(), githubId)
        });  
    }

    async getCollaborators(githubId: number): Promise<MemberResponse[]> {
        let result = await this.#allProm<{githubId: number, username: string}>(
            'select githubId, username from repository_members where githubId = ?', githubId);
        return result.map(r => ({
            login: r.username
        }))
    }

    //TODO: uitzoeken hoe je dit netter promisified...

    #runProm(query: string, ...args: any[]): Promise<undefined | { lastID: number }> {
        return new Promise((resolve, reject) => {
            this.#db.run(query, ...args, function (err) {
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
            this.#db.exec(query, ...args, function (err) {
                if (err) { reject(err); } else {
                    resolve();
                }
            });
        });
    }

    #getProm<T>(query: string, ...args: any[]): Promise<T> {
        return new Promise((resolve, reject) => {
            this.#db.get(query, ...args, function (err, result) {
                if (err) { reject(err); } else {
                    resolve(result);
                }
            });
        });
    }

    #allProm<T>(query: string, ...args: any[]): Promise<T[]> {
        return new Promise((resolve, reject) => {
            this.#db.all(query, ...args, function (err, result) {
                if (err) { reject(err); } else {
                    resolve(result);
                }
            });
        });
    }

    async updateSections(courseDTO: CourseDTO) {
        let savedCourse = await this.getCourse(courseDTO.canvasId);

        await this.#inTransaction(async () => {
            await this.#runProm('delete from sections where courseId=?', [savedCourse.canvasId]);

            let sections = Object.keys(courseDTO.sections);

            async function insertSection(k) {
                let runResult = await this.#runProm('insert into sections(name, courseid) values (?,?)', [k, savedCourse.canvasId]);
                let sectionId = runResult.lastID
                async function upsertStudent(s) {
                    let existingStudent = await this.#getProm('select * from students where id = ?', [s.studentId]);
                    if (!existingStudent) {
                        await this.#runProm('insert into students(id, email, name) values(?,?,?);', [s.studentId, s.email, s.name]);
                    }
                    await this.#runProm('insert into students_sections(studentId, sectionId) values(?,?);', [s.studentId, sectionId]);

                }
                await Promise.all(courseDTO.sections[k].map(upsertStudent.bind(this)));
            };
            await Promise.all(sections.map(insertSection.bind(this)));

            await this.#runProm('update courses set lastSectionCheck = ? where canvasId = ?', new Date().toISOString(), courseDTO.canvasId)
        });
    }

    async getCourse(canvasId) {
        let rows = await this.#allProm<any>(`
                select c.name as courseName, sec.name as sectionName, stu.name as studentName, stu.id as studentId, * from courses c 
                    left join sections sec on sec.courseId = c.canvasid
                    left join students_sections ss on ss.sectionId = sec.id
                    left join students stu on ss.studentId = stu.id
                    where c.canvasId = ?
                    order by sec.name
                `, [canvasId]);

        let courseDTO: CourseDTO = {
            name: rows[0].courseName,
            canvasId: rows[0].canvasId,
            assignments: [rows[0].githubVerantAssignment, rows[0].githubProjectAssignment],
            sections: {}
        };

        for (let r of rows) {
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

    async initSchema() {
        const schema = await fs.readFile('./create_schema.sql', { encoding: 'utf-8' });
        await this.#execProm(schema);
    }

    async initData() {
        this.addCourse(s2);
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
