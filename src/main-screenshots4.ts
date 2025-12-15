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
                    "git push origin sprint-b-1-stats",
                    "git checkout main"
                ],
                    organization, portfolio, portfolioRepo
                )

                await s3App.githubClient.createPr(organization, portfolioRepo, 
                    "Stats toevoegen voor Sprint B-1", "Deze PR voegt de stats screenshot toe voor sprint B1... Hoop ik. Sinds vorige keer zitten er nu meerdere repos in hetzelfde screenshot, omdat men nu in verschillende project & oefening-repos heeft gewerkt", 
                    "sprint-b-1-stats", "main");
            } catch (err) {
                console.error(`\t\tError processing ${portfolioRepo}: ${err}`);
                continue;
            }
        }
    }
}
main();