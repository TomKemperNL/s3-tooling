import { S3App } from "../../src/main/index";
import { Settings } from "../../src/shared";

require('@dotenvx/dotenvx').config({path: ['.dev.env', '.env']})

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
    const id = 44633;

    let result = await app.canvasClient.getAllSubmissionsForStudent({ course_id: 44633, student_id: 86859 });

    

    console.log("result", result);

    console.timeEnd("start")
    // await writeFile('result.json', JSON.stringify(result), { encoding: 'utf-8' })
    
}

main();

