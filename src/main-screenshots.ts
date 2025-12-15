import { config } from "@dotenvx/dotenvx";
import * as path from "path";
import { app, BrowserWindow, ipcMain } from 'electron'
import { createApp } from "./main/app"
import { setupIpcMainHandlers } from "./electron-setup";
import "./electron-setup";
import { existsSync } from "fs";
import { s3 } from "./temp";


config();

async function createWindow(courseId: number, user: string) {
    console.log(`Creating window for ${user}`);
    const win = new BrowserWindow({
        width: 1200,
        height: 700,
        webPreferences: {
            sandbox: false, //We gebruiken nu imports & requires in de reload, (vanwege de decorators)... voorlopig een goede deal, maar misschien kan dit beter?
            preload: path.join(__dirname, 'preload.js'),
            offscreen: true
        },
        frame: false,
    });

    await win.loadFile('./renderer/screenshot.html');
    console.log(`Sending load-user-stats for ${courseId} and ${user}`);
    win.webContents.send('load-user-stats', { courseId, user })
}


async function main() {
    const courseId = 50055;
    const s3App = await createApp();
    await setupIpcMainHandlers(s3App);

    let todoQueue: string[] = [];

    ipcMain.handle("request:screenshot", async (e, fileName: string) => {
        await s3App.screenshotController.requestScreenshot(e.sender, fileName);

        if (todoQueue.length == 0) {
            app.quit();
        } else {
            let next = todoQueue.pop();
            createWindow(courseId, next);            
        }
    });

    app.whenReady().then(async () => {
        todoQueue = await s3App.db.selectDistinctUsernames(courseId);

        let existingMembers : string[] = [];
        for(let member of todoQueue) {
            if(existsSync(path.join('.', 'screenshots', `${member}-screenshot.png`))) {
                existingMembers.push(member);
            }
        }
        for(let member of existingMembers) {
            const index = todoQueue.indexOf(member);
            if(index > -1) {
                todoQueue.splice(index, 1);
            }
        }

        console.log(todoQueue)
        let next = todoQueue.pop();
        createWindow(courseId, next);
    });

}
main();