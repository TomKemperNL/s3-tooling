import { config } from "@dotenvx/dotenvx";
import { createApp } from "./main/index"
import { setupWebHandlers } from "./web-setup";
import { readFile, writeFile } from "fs/promises";
import { setupIpcMainHandlers } from "./electron-setup";
import * as path from "path";
import { app, BrowserWindow, shell } from 'electron'
import "./electron-setup";
import { s3 } from "./temp";


export function loadJson(path: string): Promise<any> {
    return readFile(path, { encoding: 'utf-8' })
        .then(data => JSON.parse(data));
}


config();
async function main() {
    const s3App = await createApp();
    if (process.argv.indexOf('webonly') !== -1) {
        await setupWebHandlers(s3App);
    } else if (process.argv.indexOf('load') !== -1) {
        
        const courseId = parseInt(process.argv[process.argv.indexOf('load') + 1]);
        const assignmentName = process.argv[process.argv.indexOf('load') + 2];
        await s3App.coursesController.loadCourse(courseId);
        await s3App.repoController.loadRepos(courseId, assignmentName, { sections: [] });
    } else if (process.argv.indexOf('loadMappings') !== -1) {
        
        const courseId = parseInt(process.argv[process.argv.indexOf('loadMappings') + 1]);
        const fileName = process.argv[process.argv.indexOf('loadMappings') + 2];
        console.log(`Loading usermappings from ${fileName} for course ${courseId}`);
        let mappings = await loadJson(fileName);
        
        for(const key of Object.keys(mappings)) {
            console.log(`Updating mapping for ${key} to ${mappings[key]}`);
            await s3App.repoController.updateAuthorMapping(courseId, key, mappings[key]);    
        }
        
        console.log(`Loaded usermappings from ${fileName} for course ${courseId}`);
    }else if (process.argv.indexOf('exportMappings') !== -1) {
        
        const courseId = parseInt(process.argv[process.argv.indexOf('exportMappings') + 1]);
        const fileName = process.argv[process.argv.indexOf('exportMappings') + 2];
        console.log(`Exporting usermappings from ${courseId} to ${fileName}`);
        const mapping = await s3App.repoController.exportAuthorMapping(courseId);
        await writeFile(fileName, JSON.stringify(mapping), { encoding: 'utf-8' });

        console.log(`Exported usermappings from ${courseId} to ${fileName}`);
    }else {        
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
                    const newUrl = url.replace('external://', 'https://');
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