import { config } from "@dotenvx/dotenvx";
import * as path from "path";
import { app, BrowserWindow, ipcMain } from 'electron'
import { createApp } from "./main/index"
import { setupIpcMainHandlers } from "./electron-setup";
import "./electron-setup";
import { s3 } from "./temp";


config();

async function createWindow(courseId: number, assignment: string, organisation: string, repository: string, user: string) {
    const win = new BrowserWindow({
        width: 1200,
        height: 500,
        webPreferences: {
            sandbox: false, //We gebruiken nu imports & requires in de reload, (vanwege de decorators)... voorlopig een goede deal, maar misschien kan dit beter?
            preload: path.join(__dirname, 'preload.js'),
            offscreen: true
        },
        frame: false,
    });

    await win.loadFile('./renderer/screenshot.html');
    win.webContents.send('load-user-stats', { courseId, assignment, organisation, repository, user })
}


async function main() {
    let s3App = await createApp();
    await setupIpcMainHandlers(s3App);

    ipcMain.handle("request:screenshot", async (e, fileName: string) => {
        await s3App.screenshotController.requestScreenshot(e.sender, fileName);
    });

    app.whenReady().then(async () => {

        let courseId = 50055;
        let assignment = 's3-project';
        let organization = 'HU-SD-S3-Studenten-S2526';
        let repo = process.argv[2];

        console.log(process.argv);

        // let repos = await s3App.db.selectReposByCourse(courseId);
        // repos = repos.filter(r => r.name.startsWith(assignment));
        // repos.sort((a, b) => a.name.localeCompare(b.name));

        // console.log(repos.map(r => r.name).join('\n'));

        // for (let repo of repos) {
        //     console.log(`Repo: ${repo.name}`);
            //prefill cache once per repo:
        
        await s3App.statisticsController.getRepoStats(courseId, assignment, repo);
        await s3App.statisticsController.getGroupPie(courseId, assignment, repo);
    
        let members = await s3App.db.getCollaborators(organization, repo);
        for (let member of members) {
            console.log(`\tMember: ${member.login}`);
            createWindow(courseId, assignment, organization, repo, member.login);
        }
    
    });

    //Om op Linux/Windows lekkende processen te voorkomen:
    app.on('window-all-closed', () => {
        app.quit();
    });


}
main();