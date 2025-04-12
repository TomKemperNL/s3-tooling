import { Database } from "sqlite3";
import fs from 'fs/promises';
import { s2 } from '../temp'

// db.serialize(()=>{
//     db.get('select 1,2,3', (err, res) => {
//         console.log(res);
//     })
// });

export type CourseDb = {

}

class Db {
    #db = new Database('s3-tooling.sqlite3');

    async reset() {
        await this.delete();
        this.#db = new Database('s3-tooling.sqlite3');
        await this.initSchema();
        await this.initData();
    }

    async getCourses() {
        return new Promise((resolve, reject) => {
            this.#db.all("select * from courses;", (err, rows) => {
                if (err) { throw err; }
                else {
                    resolve(rows);
                }
            })
        })
    }

    async initSchema() {

        const schema = await fs.readFile('./create_schema.sql', { encoding: 'utf-8' });
        console.log('executing', schema)
        return new Promise<void>((resolve, reject) => {
            this.#db.run(schema, (err) => {
                if (err) { reject(err); } else {
                    resolve();
                }
            });
        });


    }

    async initData() {
        this.#db.run(`insert into courses(
            name, 
            canvasId, canvasVerantAssignmentId, canvasGroups,
            githubStudentOrg, githubVerantAssignment, githubProjectAssignment)
            values(
            ?,
            ?,?,?,
            ?,?,?)`, [
            'S2',
            s2.canvasCourseId, s2.canvasVerantwoordingAssignmentId, s2.canvasGroupsName,
            s2.githubStudentOrg, s2.verantwoordingAssignmentName, s2.projectAssignmentName
        ])
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
