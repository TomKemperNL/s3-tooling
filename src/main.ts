import { GithubClient } from "./main/github_client";
import { FileSystem } from "./main/filesystem_client";
import { CanvasClient } from "./main/canvas_client";
import { s2 } from "./temp";
import { Repo, RepositoryStatistics } from "./core";
import { config } from "@dotenvx/dotenvx";
import { Database } from "sqlite3";
const { app, BrowserWindow } = require('electron')

config();

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

    for (let repo of myPrjRepos.concat(myVrRepos)) {
        fileSystem.cloneRepo(prefix, repo);
    }
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

async function main() {
    const createWindow = () => {
        const win = new BrowserWindow({
            width: 800,
            height: 600
        })

        win.loadFile('./dist/src/renderer/index.html')
    }

    app.whenReady().then(() => {
        createWindow();

        //Volgens de electron-docs een 'mac-hack', het zal wel:)
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow()
        });
    });

    //Om op Linux/Windows lekkende processen te voorkomen:
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit()
    });

    let db = new Database('test.sqlite3');
    db.serialize(()=>{
        db.get('select 1,2,3', (err, res) => {
            console.log(res);
        })
    });

    await klooienMetRepos();
}
main();
