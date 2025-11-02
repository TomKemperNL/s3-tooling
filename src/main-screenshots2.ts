import { config } from "@dotenvx/dotenvx";
import * as path from "path";
import { createApp } from "./main/index"
import "./electron-setup";
import { s3 } from "./temp";
import { copyFile, readFile } from 'fs/promises'
import { read } from "fs";

config();

function getSections(sectionsObj: any, studentEmail: string){
    let sections: string[] = [];

    for(const section of Object.keys(sectionsObj)){
        const students = sectionsObj[section];
        if(students.some((s: any) => s.email.toLowerCase() === studentEmail.toLowerCase())){
            sections.push(section);
        }
    }

    return sections;
}


async function main() {
    const s3App = await createApp();


    const courseId = s3.canvasId;
    const sprint = 2;
    const assignment = 's3-project';
    const portfolio = 's3-portfolio';
    const organization = 'HU-SD-S3-Studenten-S2526';

    let course = await s3App.db.getCourse(courseId);
    let userMapping = await s3App.db.getGHUserToStudentMailMapping(courseId);
    console.log(userMapping);
    let extraUserMapping = await readFile('./testS1Mappings.json', { encoding: 'utf-8' }).then(data => JSON.parse(data));
    for(let key of Object.keys(extraUserMapping)) {
        userMapping[key] = extraUserMapping[key];
    }

    let repos = await s3App.db.selectReposByCourse(courseId);
    repos = repos.filter(r => r.name.startsWith(assignment));

    for (const repo of repos) {
        console.log(`Repo: ${repo.name}`);
        if(['s3-project-teachers-united', 's3-project-docent-test'].includes(repo.name)) {
            console.log('Skipping' + repo.name);
            continue;
        }

        const members = await s3App.db.getCollaborators(organization, repo.name);
        for (const member of members) {            
            const portfolioRepo = portfolio + '-' + member.login;
            const portfolioPath = await s3App.fileSystem.getRepoPath(organization, portfolio, portfolioRepo);
            if(!portfolioPath){
                console.log(`\t\tNo portfolio found for ${member.login} (${portfolioRepo})`);
                continue;
            }
            const huAddress = userMapping[member.login];
            if(!huAddress) {
                console.log(`\t\tNo HU address found for ${member.login}`);
                continue;
            }
            const sections = getSections(course.sections, huAddress);
            const activeSection = sections.find(s => s.endsWith(`-${sprint}`));
            if(!activeSection) {
                console.log(`\t\tNo active section found for ${member.login} (${huAddress}) in sprint ${sprint}`);
                continue;
            }
            // console.log(`\tMember: ${member.login} in section(s) ${sections.join(', ')} (using ${activeSection})`);
                        
            let targetFolder = null;
            if(activeSection.startsWith('Backend')){
                targetFolder = 'backend';
            }else if(activeSection.startsWith('Frontend')){
                targetFolder = 'frontend';
            }else if(activeSection.startsWith('Analist')){
                targetFolder = 'analist-architect';
            }

            const pngPath = path.join(portfolioPath, 'sprints', 'blok-a', targetFolder, 'stats.png');
            const sourcePath = path.join('.', 'screenshots', `${member.login}-screenshot.png`);
            console.log(`\t\tCopying ${sourcePath} to ${pngPath}`);
            await copyFile(sourcePath, pngPath);
            
        }
    }
}
main();