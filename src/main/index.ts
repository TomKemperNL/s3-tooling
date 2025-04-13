import { GithubClient } from "./github_client";
import { FileSystem } from "./filesystem_client";
import { CanvasClient } from "./canvas_client";

import { s2 } from "./../temp";
import { Repo, RepositoryStatistics } from "./../core";
import { ipcMain } from 'electron';

const githubClient = new GithubClient();
const fileSystem = new FileSystem();
const canvasClient = new CanvasClient();


async function checkoutClass(prefix: string, className: string) {
    let sections = await canvasClient.getSections({ course_id: s2.canvasCourseId });
    let usermapping = await canvasClient.getGithubMapping(
        { course_id: s2.canvasCourseId },
        { assignment_id: s2.canvasVerantwoordingAssignmentId }
        , s2.verantwoordingAssignmentName);
    // let groups = await canvasClient.getGroups({ course_id: s2.canvasCourseId }, s2.canvasGroupsName);

    let repoResponses = await githubClient.listRepos(s2.githubStudentOrg);
    let repos = repoResponses.map(r => new Repo(r, s2));
    let projectRepos = repos.filter(r => r.isProjectRepo);
    let verantwoordingRepos = repos.filter(r => r.isVerantwoordingRepo);

    let klasB = sections.find(s => s.name === className);
    console.log(klasB.students);
    let usersKlasB = klasB.students.map(s => usermapping[s.login_id])
    let myVrRepos = verantwoordingRepos.filter(vRep => usersKlasB.indexOf(vRep.owner) >= 0)
    let myPrjRepos = [];

    for (let prjRepo of projectRepos) {
        let collaborators = await githubClient.getMembers(s2.githubStudentOrg, prjRepo.name);
        let logins = collaborators.map(c => c.login);
        if (logins.some(l => usersKlasB.indexOf(l) >= 0)) {
            myPrjRepos.push(prjRepo);
        }
    }

    // for (let repo of myPrjRepos.concat(myVrRepos)) {
    //     fileSystem.cloneRepo(prefix, repo);
    // }
}

async function klooienMetRepos() {
    let ghSelf = await githubClient.getSelf();
    let canvasSelf = await canvasClient.getSelf();

    // await checkoutClass('S2-V2A', 'TICT-SD-V1A');   

    let repos = await fileSystem.getRepoPaths('HU-SD-S2-studenten-2425');
    for (let repoPaths of repos) {
        console.log(repoPaths);
        let stats = await fileSystem.getRepoStats(...repoPaths);
        let coreStats = new RepositoryStatistics(stats);
        // console.log(coreStats.getChangesByAuthor('Kay'));
        console.log(coreStats.getLinesTotal());
        console.log(coreStats.getLinesPerAuthor());
    }
}

import { db } from "./db"

export async function main() {
    ipcMain.handle("courses:get", () => {
        return db.getCourseConfigs();
    });

    ipcMain.handle("course:load", async (e, id) => {
        let savedCourse = await db.getCourse(id);
        console.log('saved Course', savedCourse)
        if (Object.keys(savedCourse.sections).length === 0) {

            let sections = await canvasClient.getSections({ course_id: s2.canvasCourseId });
            for(let section of sections){
                if(section.name === savedCourse.name){
                    continue; //Elke cursus heeft zo'n sectie waar 'iedereen' in zit. Die lijkt me niet handig?
                }
                savedCourse.sections[section.name] = section.students.map(s => ({
                    name: s.name,
                    studentId: parseInt(s.sis_user_id),
                    email: s.login_id
                }));
            }

            await db.updateSections(savedCourse);
        }
        
        return savedCourse;

    });
}