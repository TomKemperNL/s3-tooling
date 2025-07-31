import { S3App } from "../../src/main/index";
import { Settings } from "../../src/shared";
import { importUserMappingTemp } from "../../src/temp";

require('@dotenvx/dotenvx').config({path: ['.dev.env', '.env']})

import { writeFile } from "fs/promises";

let settings : Settings = {
    githubToken: process.env.ACCES_TOKEN,
    canvasToken: process.env.CANVAS_TOKEN,
    dataPath: 'C:/s3-tooling-data',
    keepDB: true,
    ignoreAuthors: []
}

async function main(){

    let app = new S3App(settings);
    await app.init();
    console.time("start")

    const id = 44633; 
    const repo = ['HU-SD-S2-studenten-2425', 'sd-s2-project','sd-s2-project-samensterk'];
    const section = "TICT-SD-V1A";
    const assignment = "sd-s2-project";

    await app.coursesController.loadCourse(44633);
    // let result = await app.statisticsController.getClassStats(44633, assignment, section)
    // let result = await app.statisticsController.getCourseStats(id, assignment)
    // let result = await app.repoController.getCurrentUserMappingFromCourse(id, assignment);
    let result = await importUserMappingTemp();



    console.log("result", result);

    console.timeEnd("start")
    // await writeFile('result.json', JSON.stringify(result), { encoding: 'utf-8' })
    
}

main();

