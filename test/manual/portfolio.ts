import { StringDict } from "../../src/main/canvas-client";
import { S3App } from "../../src/main/app";
import { Settings } from "../../src/shared";

require('@dotenvx/dotenvx').config({ path: ['.dev.env', '.env'] })


const settings: Settings = {
    githubToken: process.env.ACCESS_TOKEN,
    canvasToken: process.env.CANVAS_TOKEN,
    dataPath: 'C:/s3-tooling-data2',
    keepDB: true,
    ignoreAuthors: [],
    authorizedUsers: []
}

async function main(){

    const app = new S3App(settings);
    await app.init();

    const resp = await app.canvasClient.getSections({ course_id: 50055});
    
    // console.log(resp.flatMap(sec => sec.students));
    const students = resp.find(s => s.name === 'TICT-SD-VS3H-25').students;
    
    for(const s of students){
        const subs = await app.canvasClient.getCalloutsForStudent({ course_id: 50055, student_id: s.id});
        if(subs.length > 0){
            console.log(s.name);
            console.log(subs);
        }
    }
}

main();