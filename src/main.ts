import { GithubClient } from "./github_client";
import { FileSystem } from "./filesystem_client";
import { CanvasClient } from "./canvas_client";
import { s2 } from "./temp";
import { Repo } from "./core";

const githubClient = new GithubClient();
const fileSystem = new FileSystem();
const canvasClient = new CanvasClient();


async function main() {
    // let ghSelf = await githubClient.getSelf();
    // let canvasSelf = await canvasClient.getSelf();

    let sections = await canvasClient.getSections({ course_id: s2.canvasCourseId });
    let usermapping = await canvasClient.getGithubMapping(
        { course_id: s2.canvasCourseId },
        { assignment_id: s2.canvasVerantwoordingAssignmentId }
        , s2.verantwoordingAssignmentName);
    // let groups = await canvasClient.getGroups({ course_id: s2.canvasCourseId }, s2.canvasGroupsName);
    // console.log(ghSelf, canvasSelf, groups, groups.length);

    console.log(sections);
    // return;

    let repoResponses = await githubClient.listRepos(s2.githubStudentOrg);
    let repos = repoResponses.map(r => new Repo(r, s2));
    let projectRepos = repos.filter(r => r.isProjectRepo);
    let verantwoordingRepos = repos.filter(r => r.isVerantwoordingRepo);

    //En stel ik ben geinteresseerd in klas B...
    let klasB = sections.find(s => s.name === 'TICT-SD-V1B');
    let usersKlasB = klasB.students.map(s => usermapping[s.login_id])


    let myVrRepos = verantwoordingRepos.filter(vRep => usersKlasB.indexOf(vRep.owner) >= 0)
    let myPrjRepos = [];
    
    for(let prjRepo of projectRepos){
        let collaborators =  await githubClient.getMembers(s2.githubStudentOrg, prjRepo.name);
        let logins = collaborators.map(c => c.login);
        if(logins.some(l => usersKlasB.indexOf(l) >= 0)){
            myPrjRepos.push(prjRepo);
        }
    }

    console.log(myPrjRepos.map(p => p.name));
    console.log(myVrRepos.map(v => v.name));


}

main();
