import { GithubClient } from "./github_client";
import { FileSystem } from "./filesystem_client";
import { CanvasClient } from "./canvas_client";
import { s2 } from "./temp";
import { a } from "vitest/dist/chunks/suite.d.FvehnV49.js";

const githubClient = new GithubClient();
const fileSystem = new FileSystem();
const canvasClient = new CanvasClient();


async function main(){
    let ghSelf = await githubClient.getSelf();
    let canvasSelf = await canvasClient.getSelf();

    // let sections = await canvasClient.getSections({ course_id: s2.canvasCourseId });

    console.log(ghSelf, canvasSelf);

}

main();
