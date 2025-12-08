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
    const id = 50055;

    // let result = await app.canvasClient.getAllSubmissionsForStudent({ course_id: id, student_id: 361682 });
    let result = await app.coursesController.getStudentProgress(id, 361682);

    console.log('Result', JSON.stringify(result, null, 2));
}


main();
