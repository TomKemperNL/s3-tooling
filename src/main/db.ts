import { Database } from "sqlite3";
import fs from 'fs/promises';
import { s2 } from '../temp'
import { CourseConfig, CourseDTO } from "../core";

type CourseDb = {
    id: number,
    name: string,
    canvasId: number,
    canvasVerantAssignmentId: number,
    canvasGroups: string,
    githubStudentOrg: string,
    githubVerantAssignment: string,
    githubProjectAssignment: string
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

    async reset() {
        await this.delete();
        this.#db = this.#initializer();
        await this.initSchema();
        await this.initData();
    }

    async getCourseConfig(id: number): Promise<CourseConfig> {
        let r = await this.#getProm<CourseDb>("select * from courses where canvasId = ?;", [id]);
        if(r){
            return {
                name: r.name,
                canvasCourseId: r.canvasId,
                canvasVerantwoordingAssignmentId: r.canvasVerantAssignmentId,
                canvasGroupsName: r.canvasGroups,
    
                githubStudentOrg: r.githubStudentOrg,
                verantwoordingAssignmentName: r.githubVerantAssignment,
                projectAssignmentName: r.githubProjectAssignment
            }
        }
    }

    async getCourseConfigs(): Promise<CourseConfig[]> {
        let rows = await this.#allProm<CourseDb>("select * from courses;");
        let results: CourseConfig[] = rows.map(r => ({
            name: r.name,
            canvasCourseId: r.canvasId,
            canvasVerantwoordingAssignmentId: r.canvasVerantAssignmentId,
            canvasGroupsName: r.canvasGroups,

            githubStudentOrg: r.githubStudentOrg,
            verantwoordingAssignmentName: r.githubVerantAssignment,
            projectAssignmentName: r.githubProjectAssignment
        }));
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

    updateUserMapping(courseId: number, usermapping: { [key: string]: string | number; }) {
        
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

        await this.#runProm('BEGIN TRANSACTION;');
        await this.#runProm('delete from sections where courseId=?', [savedCourse.canvasId]);

        let sections = Object.keys(courseDTO.sections);

        async function insertSection(k){
            let runResult = await this.#runProm('insert into sections(name, courseid) values (?,?)', [k, savedCourse.canvasId]);
            let sectionId = runResult.lastID
            async function upsertStudent(s){
                let existingStudent = await this.#getProm('select * from students where id = ?', [s.studentId]);
                if(!existingStudent){
                    await this.#runProm('insert into students(id, email, name) values(?,?,?);', [s.studentId, s.email, s.name]);
                }
                await this.#runProm('insert into students_sections(studentId, sectionId) values(?,?);', [s.studentId, sectionId]);
                
            }
            await Promise.all(courseDTO.sections[k].map(upsertStudent.bind(this)));
        };
        await Promise.all(sections.map(insertSection.bind(this)));        
        await this.#runProm('COMMIT TRANSACTION;');
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

    async close(){
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
