import { createApp } from "../src/main/index";
import { FileSystem } from "../src/main/filesystem-client";
import { Settings } from "../src/shared";
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

    let app = await createApp(settings);
    console.time("start")

    const id = 44633; 
    const repo = ['HU-SD-S2-studenten-2425', 'sd-s2-project','sd-s2-project-samensterk'];
    const section = "TICT-SD-V1A";
    const assignment = "sd-s2-project";

    await app.coursesController.loadCourse(44633);
    // let result = await app.statisticsController.getClassStats(44633, assignment, section)
    let result = await app.statisticsController.getCourseStats(id, assignment)
    
    console.log("result", result);

    console.timeEnd("start")
    await writeFile('result.json', JSON.stringify(result), { encoding: 'utf-8' })
    
}

main();

