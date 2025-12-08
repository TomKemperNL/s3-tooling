import { config } from "@dotenvx/dotenvx";
import * as path from "path";
import { createApp } from "./main/index"
import "./electron-setup";
import { s3 } from "./temp";
import { copyFile, readFile } from 'fs/promises'
import { existsSync, read } from "fs";

config();

async function main() {
    const s3App = await createApp();


    const courseId = s3.canvasId;
    const portfolio = 's3-portfolio';
    const organization = 'HU-SD-S3-Studenten-S2526';    

    const members = await s3App.db.selectDistinctUsernames(courseId);
    for (const member of members) {            
        const portfolioRepo = portfolio + '-' + member;
        const portfolioPath = await s3App.fileSystem.getRepoPath(organization, portfolio, portfolioRepo);
        if(!portfolioPath){
            console.log(`\t\tNo portfolio found for ${member} (${portfolioRepo})`);
            continue;
        }      
                   

        const pngPath = path.join(portfolioPath, 'sprints', 'blok-b', 'sprint-1', 'stats.png');
        const sourcePath = path.join('.', 'screenshots', `${member}-screenshot.png`);
        
        try{
            
            if(existsSync(sourcePath)){
                console.log(`\t\tCopying ${sourcePath} to ${pngPath}`);
                await copyFile(sourcePath, pngPath);
            }
            
        }catch(err){
            console.error(`\t\tError copying file: ${err}`);
        }
            
            
        
    }
}
main();