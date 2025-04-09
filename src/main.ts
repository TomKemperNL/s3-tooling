import { GithubClient } from "./github_client";
import { FileSystem } from "./filesystem_client";
import { CanvasClient } from "./canvas_client";
import { s2 } from "./temp";
import { a } from "vitest/dist/chunks/suite.d.FvehnV49.js";

const githubClient = new GithubClient();
const fileSystem = new FileSystem();
const canvasClient = new CanvasClient();


async function main() {
    // let ghSelf = await githubClient.getSelf();
    // let canvasSelf = await canvasClient.getSelf();

    // let sections = await canvasClient.getSections({ course_id: s2.canvasCourseId });
    // let usermapping = await canvasClient.getGithubMapping(
    //     { course_id: s2.canvasCourseId },
    //     { assignment_id: s2.canvasVerantwoordingAssignmentId }
    //     , s2.verantwoordingAssignmentName);
    // let groups = await canvasClient.getGroups({ course_id: s2.canvasCourseId }, s2.canvasGroupsName);
    // console.log(ghSelf, canvasSelf, groups, groups.length);

    let repos = await githubClient.listRepos(s2.githubStudentOrg);
    console.log(repos);
}

main();
