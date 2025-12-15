import { config } from "@dotenvx/dotenvx";
import * as path from "path";
import { createApp } from "./main/app"
import "./electron-setup";
import { s3 } from "./temp";
import { copyFile } from 'fs/promises'

config();


async function main() {
    const s3App = await createApp();


    const courseId = s3.canvasId;
    const sprint = "b-1";
    const assignment = 's3-project';
    const portfolio = 's3-portfolio';
    const organization = 'HU-SD-S3-Studenten-S2526';
    let repos = await s3App.db.selectReposByCourse(courseId);
    repos = repos.filter(r => r.name.startsWith(assignment));

    for (const repo of repos) {
        console.log(`Repo: ${repo.name}`);
        if (['s3-project-teachers-united', 's3-project-docent-test'].includes(repo.name)) {
            console.log('Skipping' + repo.name);
            continue;
        }

        const members = await s3App.db.getCollaborators(organization, repo.name);
        for (const member of members) {
            const portfolioRepo = portfolio + '-' + member.login;
            console.log('\t' + portfolioRepo);
            try {


                await s3App.fileSystem.runCommands([                    
                    `git checkout -b sprint-${sprint}-stats`,
                    "git add .",
                    `git commit -m "Added stats screenshot for sprint ${sprint}"`,              
                ],
                    organization, portfolio, portfolioRepo
                )

            } catch (err) {
                console.error(`\t\tError processing ${portfolioRepo}: ${err}`);
                continue;
            }
        }
    }
}
main();