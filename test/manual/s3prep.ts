import { StringDict } from "../../src/main/canvas-client";
import { S3App } from "../../src/main/index";
import { Settings } from "../../src/shared";

require('@dotenvx/dotenvx').config({ path: ['.dev.env', '.env'] })

import { writeFile } from "fs/promises";

let settings: Settings = {
    githubToken: process.env.ACCESS_TOKEN,
    canvasToken: process.env.CANVAS_TOKEN,
    dataPath: 'C:/s3-tooling-data2',
    keepDB: true,
    ignoreAuthors: [],
    authorizedUsers: []
}

function flip(input: StringDict): StringDict {
    let out: StringDict = {};
    for (let key in input) {
        let outKey = input[key];
        if (outKey === null || outKey === undefined || outKey === '') {
            continue;
        }
        if (out[outKey]) {
            throw new Error(`Duplicate key ${outKey} in flipped mapping`);
        }
        out[outKey] = key;
    }
    return out;
}


async function main() {
    let app = new S3App(settings);
    await app.init();

    let courseId = 44633;
    let assignment = 'sd-s2-project';
    let loginUserMapping = await app.db.getUserMapping(courseId);
    loginUserMapping = flip(loginUserMapping)

    let repos = await app.db.selectReposByCourse(courseId);
    repos = repos.filter(r => r.name.startsWith(assignment));

    for (let r of repos) {
        console.log(`Repo: ${r.name}`);
        let teamStats = await app.statisticsController.getRepoStats(courseId, assignment, r.name);
      
    }


}
main();