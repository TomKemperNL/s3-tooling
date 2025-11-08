import { S3App } from "../../src/main/index";
import { Settings } from "../../src/shared";
import { importUserMappingTemp } from "../../src/temp";

require('@dotenvx/dotenvx').config({path: ['.dev.env', '.env']})

import { writeFile } from "fs/promises";

let settings : Settings = {
    githubToken: process.env.ACCESS_TOKEN,
    canvasToken: process.env.CANVAS_TOKEN,
    dataPath: 'C:/s3-tooling-data2',
    keepDB: true,
    ignoreAuthors: [],
    authorizedUsers: []
}

async function main(){
    let app = new S3App(settings);
    await app.init();
    console.time("start")

    const id = 44633; 
    const repo = ['HU-SD-S2-studenten-2425', 'sd-s2-project','sd-s2-project-pentacode'];
    const section = "TICT-SD-V1A";
    const assignment = "sd-s2-project";



    let result = await app.statisticsController.getRepoStats(id, assignment, 'sd-s2-project-pentacode');
    

    console.log("result", result.week_group_author[0]);

    console.timeEnd("start")
    // await writeFile('result.json', JSON.stringify(result), { encoding: 'utf-8' })
    
}

main();

