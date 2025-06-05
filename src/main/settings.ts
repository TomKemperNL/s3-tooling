import { Settings } from "../shared";
import { app } from "electron";

import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const settingsFile = path.join(app.getPath('userData'), 'settings.json');

export async function saveSettings(settings: Settings) {
    let settingsData = JSON.stringify(settings);
    console.log("Saving settings to", settingsFile);
    await writeFile(settingsFile, settingsData, { encoding: 'utf-8' });
}

function readEnv(result: any = {}): any{
    let canvasToken = process.env.CANVAS_TOKEN;
    let githubToken = process.env.ACCESS_TOKEN;
    let keepDB = process.env.KEEP_DB;
    let ignoreAuthors = process.env.IGNORE_AUTHORS
    let dataPath = process.env.DATA_PATH;

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
    return result;
}


export async function loadSettings(): Promise<Settings> {
    console.log("Loading settings from", settingsFile);
    if(existsSync(settingsFile)) {
        let settingsData = await readFile(settingsFile, { encoding: 'utf-8' });
        let parsedSettings = JSON.parse(settingsData);

        parsedSettings = readEnv(parsedSettings);
        return parsedSettings;
    }else{
        return readEnv();
    }
}
    