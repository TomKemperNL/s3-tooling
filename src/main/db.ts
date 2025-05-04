import { Database } from "sqlite3";
import fs from 'fs/promises';
import { cisq1, cisq2, s2 } from '../temp'
import { CourseConfig, CourseDTO } from "../core";
import { MemberResponse, RepoResponse } from "./github_client";
import { SimpleDict } from "./canvas_client";

type CourseDb = {
    canvasId: number,
    name: string,
    canvasGroups: string,
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
        canvasCourseId: r.canvasId,        
        canvasGroupsName: r.canvasGroups,
        startDate: r.startDate ? new Date(Date.parse(r.startDate)) : null,
        githubStudentOrg: r.githubStudentOrg,
        assignments: as.map(a => ({
            canvasId: a.canvasId,
            githubAssignment: a.githubAssignment,
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
        let r = await this.#getProm<CourseDb>("select * from courses where canvasId = ?;", id);
        let as = await this.#allProm<AssignmentDb>("select * from course_assignments where courseId = ?", id)
        if (r) {
            return courseDbToConfig(r, as);
        }
    }

    async getCourseConfigs(): Promise<CourseConfig[]> {
        let rows = await this.#allProm<CourseDb>("select * from courses;");
        let results: CourseConfig[] = rows.map(c => courseDbToConfig(c,[])); //hacky hackmans
        return results;
    }

    async addCourse(courseConfig: CourseConfig) {
        await this.#inTransaction(async () => {
            await this.#runProm(`insert into courses(
                name, startDate,
                canvasId, canvasGroups, 
                githubStudentOrg)
                values(
                ?,?,
                ?,?,
                ?)`, [
            courseConfig.name, courseConfig.startDate?.toISOString(),
            courseConfig.canvasCourseId, courseConfig.canvasGroupsName,
            courseConfig.githubStudentOrg
            ]);

            for(let as of courseConfig.assignments){
                await this.#runProm(`insert into course_assignments(
                    courseId, githubAssignment, canvasId, groupAssignment) values(
                    ?,?,?,?
                    )`, courseConfig.canvasCourseId, as.githubAssignment, as.canvasId, as.groupAssignment)
            }
        });

        
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

    async getUserMapping(courseId: number): Promise<SimpleDict> {
        let rows = await this.#allProm<{ email: string, username: string }>(`
            select s.email, gha.username from courses c 
                join sections sec on c.canvasid = sec.courseId
                join students_sections ss on ss.sectionId = sec.id
                join students s on ss.studentid = s.id
                join githubAccounts gha on s.id = gha.studentId
                where c.canvasId = ?`, [courseId]);
        let result = {};
        for (let r of rows) {
            result[r.email] = r.username;
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
            for (let repo of repos) {
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
        let result = await this.#allProm<{ organization: string, name: string, username: string }>(
            'select organization, name, username from repository_members where organization = ? and name = ?', organization, name);
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

    async getCourse(canvasId) {
        let rows = await this.#allProm<any>(`
                select c.name as courseName, sec.name as sectionName, stu.name as studentName, stu.id as studentId, * from courses c 
                    left join sections sec on sec.courseId = c.canvasid
                    left join students_sections ss on ss.sectionId = sec.id
                    left join students stu on ss.studentId = stu.id
                    where c.canvasId = ?
                    order by sec.name
                `, [canvasId]);

        let as = await this.#allProm<AssignmentDb>("select * from course_assignments where courseId = ?", canvasId)      

        let courseDTO: CourseDTO = {
            name: rows[0].courseName,
            canvasId: rows[0].canvasId,
            assignments: as.map(a => ({
                canvasId: a.canvasId,
                githubAssignment: a.githubAssignment,
                groupAssignment: a.groupAssignment === 1
            })),
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
        await this.addCourse(s2);
        await this.addCourse(cisq1);
        await this.addCourse(cisq2);
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
