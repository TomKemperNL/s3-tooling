import { Settings } from "../settings";
import { app } from "electron";

import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const settingsFile = path.join(app.getPath('userData'), 'settings.json');

export async function saveSettings(settings: Settings) {
    let settingsData = JSON.stringify(settings);
    await writeFile(settingsFile, settingsData, { encoding: 'utf-8' });
}

function readEnv(): any{
    let canvasToken = process.env.CANVAS_TOKEN;
    let githubToken = process.env.ACCESS_TOKEN;
    let keepDB = process.env.KEEP_DB === 'true';
    let ignoredAuthors = process.env.IGNORED_AUTHORS ? process.env.IGNORED_AUTHORS.split(',') : [];
    let dataPath = process.env.DATA_PATH || 'C:/s3-tooling-data';

    let result = {};
    if(canvasToken){
        result['canvasToken'] = canvasToken;
    }
    if(githubToken){
        result['githubToken'] = githubToken;
    }
    if(keepDB){
        result['keepDB'] = keepDB;
    }
    if(ignoredAuthors){
        result['ignoredAuthors'] = ignoredAuthors;
    }
    if(dataPath){
        result['dataPath'] = dataPath;
    }
    return result;
}


export async function loadSettings(): Promise<Settings> {
    if(existsSync(settingsFile)) {
        let settingsData = await readFile(settingsFile, { encoding: 'utf-8' });
        let parsedSettings = JSON.parse(settingsData);
        return parsedSettings;
    }else{
        return readEnv();
    }
}
    