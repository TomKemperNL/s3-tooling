import { GithubClient } from "./github_client";
import { FileSystem } from "./filesystem_client";
import { CanvasClient } from "./canvas_client";

import { RepoFilter, RepoStatisticsDTO, StatsFilter, StudentFilter } from "./../core";
import { ipcMain } from 'electron';


import { db } from "./db";
import { ReposController } from "./repos/reposController";
import { CoursesController } from "./courses/coursesController";

import { saveSettings, loadSettings } from "./settings";
import { Settings } from "../settings";

async function createApp(settings: Settings) {
    let githubClient = new GithubClient(settings.githubToken);
    let fileSystem = new FileSystem(settings.dataPath);
    let canvasClient = new CanvasClient(settings.canvasToken);

    
    if (!settings.keepDB) {
        await db.reset().then(() => db.test());
    } else {
        console.log('keeping db');
    }

    return {
        githubClient, fileSystem, canvasClient,
        repoController: new ReposController(db, canvasClient, githubClient, fileSystem),
        coursesController: new CoursesController(db, canvasClient)
    };
}

export async function main() {
    let settings = await loadSettings();
    let app = await createApp(settings);

    ipcMain.handle("settings:save", async (e, settings) => {
        saveSettings(settings);
        app = await createApp(settings);
    });

    ipcMain.handle("settings:load", async (e) => {
        return loadSettings();
    });

    ipcMain.handle("courses:get", () => {
        return app.coursesController.getConfigs();
    });

    ipcMain.handle("course:load", async (e, id) => {
        return app.coursesController.loadCourse(id);
    });

    ipcMain.handle("repos:load", async (e, courseId: number, assignment: string, filter: RepoFilter) => {
        return app.repoController.loadRepos(courseId, assignment, filter);
    });

    ipcMain.handle("repostats:get", async (e, courseId: number, assignment: string, name: string, filter: StatsFilter): Promise<RepoStatisticsDTO> => {
        let mainResult = app.repoController.getRepoStats(courseId, assignment, name, filter);
        return mainResult;
    });

    ipcMain.handle("repostats-blame:get", async (e, courseId: number, assignment: string, name: string, filter: StatsFilter) => {
        return app.repoController.getBlameStats(courseId, assignment, name, filter);
    });

    ipcMain.handle("repostats-student:get", async (e, courseId: number, assignment: string, name: string, filter: StudentFilter) => {
        return app.repoController.getStatsByUser(courseId, assignment, name, filter);
    });

}