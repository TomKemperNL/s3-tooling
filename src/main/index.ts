import { GithubClient } from "./github_client";
import { FileSystem } from "./filesystem_client";
import { CanvasClient } from "./canvas_client";

import { s2 } from "./../temp";
import { Repo, RepoDTO, RepoFilter, RepositoryStatistics, RepoStatisticsDTO, StatsFilter } from "./../core";
import { ipcMain } from 'electron';

const githubClient = new GithubClient();
const fileSystem = new FileSystem();
const canvasClient = new CanvasClient();

async function klooienMetRepos() {
    let ghSelf = await githubClient.getSelf();
    let canvasSelf = await canvasClient.getSelf();

    // await checkoutClass('S2-V2A', 'TICT-SD-V1A');   

    let repos = await fileSystem.getRepoPaths('HU-SD-S2-studenten-2425');
    for (let repoPaths of repos) {
        console.log(repoPaths);
        let stats = await fileSystem.getRepoStats(...repoPaths);
        let coreStats = new RepositoryStatistics(stats);
        // console.log(coreStats.getChangesByAuthor('Kay'));
        console.log(coreStats.getLinesTotal());
        console.log(coreStats.getLinesPerAuthor());
    }
}

import { db } from "./db"

export async function main() {
    ipcMain.handle("courses:get", () => {
        return db.getCourseConfigs();
    });

    ipcMain.handle("course:load", async (e, id) => {
        let savedCourse = await db.getCourse(id);
        console.log('saved Course', savedCourse)
        if (Object.keys(savedCourse.sections).length === 0) {

            let sections = await canvasClient.getSections({ course_id: s2.canvasCourseId });
            for (let section of sections) {
                if (section.name === savedCourse.name) {
                    continue; //Elke cursus heeft zo'n sectie waar 'iedereen' in zit. Die lijkt me niet handig?
                }
                savedCourse.sections[section.name] = section.students.map(s => ({
                    name: s.name,
                    studentId: parseInt(s.sis_user_id),
                    email: s.login_id
                }));
            }

            await db.updateSections(savedCourse);
        }

        return savedCourse;
    });

    ipcMain.handle("repos:load", async (e, courseId: number, assignment: string, filter: RepoFilter) => {
        let savedCourse = await db.getCourse(courseId);
        let savedCourseConfig = await db.getCourseConfig(courseId);

        let usermapping = await canvasClient.getGithubMapping(
            { course_id: courseId },
            { assignment_id: savedCourseConfig.canvasVerantwoordingAssignmentId }
            , savedCourseConfig.verantwoordingAssignmentName);

        await db.updateUserMapping(savedCourseConfig.canvasCourseId, usermapping);

        let repoResponses = await githubClient.listRepos(savedCourseConfig.githubStudentOrg);
        let repos = repoResponses.map(r => new Repo(r, savedCourseConfig));
        let matchingRepos = repos.filter(r => r.matchesAssignment(assignment));

        
        for (let section of filter.sections) {
            let matchingLogins = [];

            if (savedCourse.sections[section]) {
                for (let student of savedCourse.sections[section]) {
                    if (usermapping[student.email]) {
                        matchingLogins.push(usermapping[student.email]);
                    }
                }
            }

            let targetRepos = []
            for (let repo of matchingRepos) {
                if(assignment === savedCourseConfig.verantwoordingAssignmentName){ //TODO: Solo assignments anders behandelen
                    if(matchingLogins.indexOf(repo.owner) >= 0){
                        targetRepos.push(repo);
                    }
                }else{
                    let collaborators = await githubClient.getMembers(savedCourseConfig.githubStudentOrg, repo.name);
                    let logins = collaborators.map(c => c.login);
                    if (logins.some(l => matchingLogins.indexOf(l) >= 0)) {
                        targetRepos.push(repo);
                    }
                }                
            }
    
            for (let repo of targetRepos) {
                fileSystem.cloneRepo([savedCourseConfig.githubStudentOrg, assignment], repo);
            }

            let results: RepoDTO[] = targetRepos.map(r => ({
                courseId: savedCourse.canvasId,
                assignment: assignment,
                groupRepo: assignment !== savedCourseConfig.verantwoordingAssignmentName,
                name: r.name
            }));

            return results;
        }       
    });

    ipcMain.handle("repostats:get", async (e, courseId: number, assignment: string, name: string, filter: StatsFilter) : Promise<RepoStatisticsDTO> => {
        let savedCourseConfig = await db.getCourseConfig(courseId);

        let stats = await fileSystem.getRepoStats(savedCourseConfig.githubStudentOrg, assignment, name);
        let coreStats = new RepositoryStatistics(stats);
        let authors = coreStats.getLinesPerAuthor();
        let totals = coreStats.getLinesTotal()

        return {
            totalAdded: totals.added,
            totalRemoved: totals.removed,
            authors
        };
    });
}