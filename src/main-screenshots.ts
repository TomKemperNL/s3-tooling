import { config } from "@dotenvx/dotenvx";
import * as path from "path";
import { app, BrowserWindow, shell } from 'electron'
import { main as nodeMain } from "./main/index"
import "./electron-setup";


config();

async function createWindow(ix: number) {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            sandbox: false, //We gebruiken nu imports & requires in de reload, (vanwege de decorators)... voorlopig een goede deal, maar misschien kan dit beter?
            preload: path.join(__dirname, 'preload.js')
        }
    });

    await win.loadFile('./renderer/screenshot.html');
    win.webContents.send('load-user-stats', { organisation: "Test", repository: "Test", user: "Test" + ix})
}


async function main() {
    await nodeMain();

    app.whenReady().then(async () => {        
        for (let i = 0; i < 30; i++) {
            createWindow(i);
        }
    });

    //Om op Linux/Windows lekkende processen te voorkomen:
    app.on('window-all-closed', () => {
        app.quit();
    });


}
main();