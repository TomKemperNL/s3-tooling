import { GithubClient } from "./github_client";
import { FileSystem } from "./filesystem_client";
import { CanvasClient } from "./canvas_client";

import { RepoFilter, RepoStatisticsDTO, StatsFilter, StudentFilter } from "./../core";
import { ipcMain } from 'electron';


import { db } from "./db";
import { ReposController } from "./repos/reposController";
import { CoursesController } from "./courses/coursesController";

import { saveSettings, loadSettings } from "./settings";



export async function main() {
    let settings = await loadSettings();
    console.log(settings)

    const githubClient = new GithubClient(settings.githubToken);
    const fileSystem = new FileSystem(settings.dataPath);
    const canvasClient = new CanvasClient(settings.canvasToken);

    const repoController = new ReposController(db, canvasClient, githubClient, fileSystem);
    const coursesController = new CoursesController(db, canvasClient);

    if(!settings.keepDB) {
        await db.reset().then(() => db.test());
    }else{
        console.log('keeping db');
    }
    ipcMain.handle("settings:save", async (e, settings) => {
        saveSettings(settings);
    });

    ipcMain.handle("settings:load", async (e) => {
        return loadSettings();
    });

    ipcMain.handle("courses:get", () => {
        return coursesController.getConfigs();
    });

    ipcMain.handle("course:load", async (e, id) => {
        return coursesController.loadCourse(id);
    });

    ipcMain.handle("repos:load", async (e, courseId: number, assignment: string, filter: RepoFilter) => {
       return repoController.loadRepos(courseId, assignment, filter);
    });

    ipcMain.handle("repostats:get", async (e, courseId: number, assignment: string, name: string, filter: StatsFilter) : Promise<RepoStatisticsDTO> => {
        let mainResult = repoController.getRepoStats(courseId, assignment, name, filter);        
        return mainResult;
    });

    ipcMain.handle("repostats-blame:get", async (e, courseId: number, assignment: string, name: string, filter: StatsFilter) => {
        return repoController.getBlameStats(courseId, assignment, name, filter);
    });

    ipcMain.handle("repostats-student:get", async (e, courseId: number, assignment: string, name: string, filter: StudentFilter) => {
        return repoController.getStatsByUser(courseId, assignment, name, filter);
    });
    
}