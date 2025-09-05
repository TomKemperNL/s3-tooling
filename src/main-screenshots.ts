import { config } from "@dotenvx/dotenvx";
import * as path from "path";
import { app, BrowserWindow, shell } from 'electron'
import { createApp } from "./main/index"
import { setupIpcMainHandlers } from "./electron-setup";
import "./electron-setup";


config();

async function createWindow(org: string, repo: string, user: string) {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            sandbox: false, //We gebruiken nu imports & requires in de reload, (vanwege de decorators)... voorlopig een goede deal, maar misschien kan dit beter?
            preload: path.join(__dirname, 'preload.js')
        }
    });

    await win.loadFile('./renderer/screenshot.html');
    win.webContents.send('load-user-stats', { organisation: org, repository: repo, user: user})
}


async function main() {
    let s3App = await createApp();
    await setupIpcMainHandlers(s3App);

    app.whenReady().then(async () => {        

        let repos = await s3App.db.selectReposByCourse(50055);
        repos = repos.filter(r => r.name.startsWith('s3-project'));

        for(let repo of repos){
            if(repo.name !== 's3-project-team-relentless'){
                continue;
            }

            let members = await s3App.db.getCollaborators(repo.organization.login, repo.name);
            // let members = await s3App.githubClient.getMembersThroughTeams(repo.organization.login, repo.name);
            for(let member of members){
                console.log(`\t${member.login}`);
                createWindow(repo.organization.login, repo.name, member.login);
            }
        }
    });

    //Om op Linux/Windows lekkende processen te voorkomen:
    app.on('window-all-closed', () => {
        app.quit();
    });


}
main();