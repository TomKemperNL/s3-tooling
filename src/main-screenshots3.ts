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
           
            s3App.fileSystem.runCommands([
                "git pull",
                "git checkout -b sprint-0-stats",
                "git add .",
                `git commit -m "Added stats screenshot for sprint 0"`,
                "git push origin sprint-0-stats",
                "git checkout main"
            ],
                organization, portfolio, portfolioRepo
            )

            s3App.githubClient.createPr(organization, repo.name, "Stats toevoegen voor Sprint 0", "Deze PR voegt de stats screenshot toe voor sprint 0... Hoop ik.", "sprint-0-stats", "main");

        }
    }
}
main();