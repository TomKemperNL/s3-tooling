import { Settings } from "../shared";
import { app } from "electron";

import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const appPath = app ? app.getPath('userData') : process.cwd();
const settingsFile = path.join(appPath, 'settings.json');

export async function saveSettings(settings: Settings) {
    const settingsData = JSON.stringify(settings);
    console.log("Saving settings to", settingsFile);
    await writeFile(settingsFile, settingsData, { encoding: 'utf-8' });
}

function readEnv(result: any = {}): any{
    const canvasToken = process.env.CANVAS_TOKEN;
    const githubToken = process.env.ACCESS_TOKEN;
    const keepDB = process.env.KEEP_DB;
    const ignoreAuthors = process.env.IGNORE_AUTHORS
    const dataPath = process.env.DATA_PATH;
    const admins = process.env.ADMINS;

    if(canvasToken){
        result['canvasToken'] = canvasToken;
    }
    if(githubToken){
        result['githubToken'] = githubToken;
    }
    if(keepDB){
        result['keepDB'] = (keepDB == 'true');
    }
    if(ignoreAuthors){
        result['ignoreAuthors'] = ignoreAuthors.split(',').map((author: string) => author.trim());
    }
    if(dataPath){
        result['dataPath'] = dataPath;
    }
    result['authorizedUsers'] = result['authorizedUsers'] || [];

    if(admins){
        result['authorizedUsers'] = result['authorizedUsers'].concat(admins.split(',').map((admin: string) => admin.trim()));
    }
    return result;
}


export async function loadSettings(): Promise<Settings> {
    console.log("Loading settings from", settingsFile);
    if(existsSync(settingsFile)) {
        const settingsData = await readFile(settingsFile, { encoding: 'utf-8' });
        let parsedSettings = JSON.parse(settingsData);

        parsedSettings = readEnv(parsedSettings);
        return parsedSettings;
    }else{
        return readEnv();
    }
}
    