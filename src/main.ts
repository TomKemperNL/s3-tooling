import { config } from "@dotenvx/dotenvx";
import { createApp } from "./main/index"
import { setupWebHandlers } from "./web-setup";
import { setupIpcMainHandlers } from "./electron-setup";
import * as path from "path";
import { app, BrowserWindow, shell } from 'electron'
import "./electron-setup";

config();
async function main() {
    let s3App = await createApp();
    if (process.argv.indexOf('webonly') !== -1) {
        await setupWebHandlers(s3App);
    } else if (process.argv.indexOf('load') !== -1) {
        let courseId = parseInt(process.argv[process.argv.indexOf('load') + 1]);
        let assignmentName = process.argv[process.argv.indexOf('load') + 2];
        await s3App.coursesController.loadCourse(courseId);
        await s3App.repoController.loadRepos(courseId, assignmentName, { sections: [] });


    } else {
        await setupWebHandlers(s3App);
        await setupIpcMainHandlers(s3App);
        const createWindow = () => {
            const win = new BrowserWindow({
                width: 800,
                height: 600,
                webPreferences: {
                    sandbox: false, //We gebruiken nu imports & requires in de reload, (vanwege de decorators)... voorlopig een goede deal, maar misschien kan dit beter?
                    preload: path.join(__dirname, 'preload.js')
                }
            });

            win.webContents.addListener('will-navigate', (event, url) => {
                if (url.startsWith('external://')) {
                    let newUrl = url.replace('external://', 'https://');
                    shell.openExternal(newUrl);
                    event.preventDefault();
                }
            });
            // win.webContents.openDevTools();


            win.loadFile('./dist/src/renderer/index.html');
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
    }

}

main();