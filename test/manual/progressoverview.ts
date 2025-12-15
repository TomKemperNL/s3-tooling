import { S3App } from "../../src/main/app";
import { Settings, StudentDTO } from "../../src/shared";

import { writeFileSync } from "fs";

require('@dotenvx/dotenvx').config({ path: ['.dev.env', '.env'] })

let settings: Settings = {
    githubToken: process.env.ACCESS_TOKEN,
    canvasToken: process.env.CANVAS_TOKEN,
    dataPath: 'C:/s3-tooling-data2',
    keepDB: true,
    ignoreAuthors: [],
    authorizedUsers: []
}


// let write = console.log;
let buffer = '';
let write = function(line: string){
    buffer += line + '\n';
}
let flush = function(filename: string){
    writeFileSync(filename, buffer, { encoding: 'utf-8' });
    buffer = '';
}   


async function main() {
    let app = new S3App(settings);
    await app.init();
    const id = 50055;

    const savedCourse = await app.db.getCourse(id);

    let students = new Set<StudentDTO>();
    for (let section of Object.keys(savedCourse.sections)) {
        for (let student of savedCourse.sections[section]) {
            students.add(student)
        }
    }

    for (let student of students) {
        write(`Student ${student.name}`);
        write('--------------------------------');
        let result = await app.coursesController.getCanvasOverview(id, student.canvasId);

        for (let overview of result.overviews) {
            
            let anyResults = overview.criteria.some(c => c.results.length > 0);
            if (!anyResults) {
                continue;
            }

            write(overview.title);
            for (let criterion of overview.criteria) {
                write(` - ${criterion.description}:`);
                for (let result of criterion.results) {
                    let achievedPoints = result.points ? result.points : 0;
                    let matchingLevel = criterion.levels.find(l => l.points === achievedPoints);
                    let levelDescription = matchingLevel ? matchingLevel.description : `${achievedPoints} points`;
                    write(`    - ${result.assignmentName}: ${levelDescription} (${result.grader ? result.grader : '???'})`);

                    if(result.comments){
                        write(`      ${result.comments}`);
                    }
                }
            }
        }


        write('')
        flush(`./peilmomenten/student-${student.name.replaceAll(' ', '_')}.txt`);
    }
    // 

}


main();
