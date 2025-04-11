import { config } from "@dotenvx/dotenvx";
import { Database } from "sqlite3";
import { main as nodeMain } from "./main/index"
const { app, BrowserWindow } = require('electron')

config();

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

    await nodeMain();
}
main();
console.log("hmmm")