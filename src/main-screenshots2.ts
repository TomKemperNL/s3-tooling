import { config } from "@dotenvx/dotenvx";
import * as path from "path";
import { createApp } from "./main/index"
import "./electron-setup";
import { s3 } from "./temp";
import { copyFile } from 'fs/promises'

config();


async function main() {
    let s3App = await createApp();


    let courseId = s3.canvasId;
    let assignment = 's3-project';
    let portfolio = 's3-portfolio';
    let organization = 'HU-SD-S3-Studenten-S2526';
    let repos = await s3App.db.selectReposByCourse(courseId);
    repos = repos.filter(r => r.name.startsWith(assignment));

    for (let repo of repos) {
        console.log(`Repo: ${repo.name}`);
        if(['s3-project-teachers-united', 's3-project-docent-test'].includes(repo.name)) {
            console.log('Skipping' + repo.name);
            continue;
        }

        let members = await s3App.db.getCollaborators(organization, repo.name);
        for (let member of members) {            
            let portfolioRepo = portfolio + '-' + member.login;
            let portfolioPath = await s3App.fileSystem.getRepoPath(organization, portfolio, portfolioRepo);
            if(!portfolioPath){
                console.log(`\t\tNo portfolio found for ${member.login} (${portfolioRepo})`);
                continue;
            }
            let pngPath = path.join(portfolioPath, 'sprints', 'blok-a', 'sprint-0', 'stats.png');
            let sourcePath = path.join('.', 'screenshots', `${member.login}-screenshot.png`);
            await copyFile(sourcePath, pngPath);
        }
    }
}
main();