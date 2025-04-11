import { config } from "@dotenvx/dotenvx";
import { main as nodeMain } from "./main/index"
import * as path from "path";
const { app, BrowserWindow } = require('electron')

config();

async function main() {
    const createWindow = () => {
        const win = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js')
              }
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


    await nodeMain();
}
main();