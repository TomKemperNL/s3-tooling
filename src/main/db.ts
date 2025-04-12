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

class Db {
    #initializer: () => Database;
    #db: Database
    constructor(initializer = null) {
        if (!initializer) {
            this.#initializer = () => new Database('s3-tooling.sqlite3');
        }
        this.#db = this.#initializer();
    }

    async reset() {
        await this.delete();
        this.#db = this.#initializer();
        await this.initSchema();
        await this.initData();
    }

    async getCourseConfigs(): Promise<CourseConfig[]> {
        return new Promise<CourseConfig[]>((resolve, reject) => {
            this.#db.all("select * from courses;", (err, rows: CourseDb[]) => {
                if (err) { reject(err); }
                else {
                    let results: CourseConfig[] = rows.map(r => ({
                        name: r.name,
                        canvasCourseId: r.canvasId,
                        canvasVerantwoordingAssignmentId: r.canvasVerantAssignmentId,
                        canvasGroupsName: r.canvasGroups,

                        githubStudentOrg: r.githubStudentOrg,
                        verantwoordingAssignmentName: r.githubVerantAssignment,
                        projectAssignmentName: r.githubProjectAssignment
                    }));
                    resolve(results);
                }
            })
        })
    }

    async addCourse(courseConfig: CourseConfig) {
        return new Promise<void>((resolve, reject) => {
            this.#db.run(`insert into courses(
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
            ], err => {
                if (err) { reject(err) } else {
                    resolve();
                }
            })
        });
    }

    async updateSections(courseDTO: CourseDTO) {
        this.#db.serialize(() => {

        });
    }

    async getCourse(canvasId) {
        return new Promise<CourseDTO>((resolve, reject) => {
            this.#db.all(`
                select c.name as courseName, sec.name as sectionName, stu.name as studentName, stu.id as studentId, * from courses c 
                    left join sections sec on sec.courseId = c.id
                    left join students_sections ss on ss.sectionId = sec.id
                    left join students stu on ss.studentId = stu.id
                    where c.canvasId = ?
                    order by sec.name
                `, [canvasId], (err, rows: any[]) => {
                if (err) { reject(err); } else {
                    if (rows.length === 0) {
                        resolve(null);
                    }
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
                    resolve(courseDTO);
                }
            });
        });
    }

    async initSchema() {
        const schema = await fs.readFile('./create_schema.sql', { encoding: 'utf-8' });
        return new Promise<void>((resolve, reject) => {
            this.#db.exec(schema, (err) => {
                if (err) { reject(err); } else {
                    resolve();
                }
            });
        });


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

    test() {
        this.#db.all('select * from courses', console.log);
    }
}

export const db = new Db();


db.reset().then(() => db.test());
