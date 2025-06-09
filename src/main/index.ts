import { GithubClient } from "./github-client";
import { FileSystem } from "./filesystem-client";
import { CanvasClient } from "./canvas-client";

import { RepoFilter, RepoStatisticsDTO, Settings, StatsFilter, StudentFilter } from "../shared";
import { ipcMain, dialog, app as electronApp } from 'electron';
import { existsSync } from "fs";

import { db } from "./db";
import { ReposController } from "./repos-controller";
import { CoursesController } from "./courses-controller";

import { saveSettings, loadSettings } from "./settings";
import { StatisticsController } from "./statistics-controller";


async function createApp(settings: Settings) {
    try{
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
            coursesController: new CoursesController(db, canvasClient),
            statisticsController: new StatisticsController(db, githubClient, fileSystem),
        };
    }catch (error) {
        console.error("Error creating app:", error);
        return {}
    }    
}

export async function main() {
    let settings = await loadSettings();
    let app = await createApp(settings);

    ipcMain.handle("startup", async (e) => {
        let allSettings = !!settings.canvasToken && !!settings.githubToken && !!settings.dataPath;
        if(allSettings){
            return {
                validSettings: true && existsSync(settings.dataPath),
                githubUser: (await app.githubClient.getSelf()).login,
                canvasUser: (await app.canvasClient.getSelf()).name                
            }
        }else{
            return {
                validSettings: false,
                githubUser: '',
                canvasUser: '',
                dirExists: false,                
            }
        }
        
    });

    ipcMain.handle("dialog:openDirectory", async (e, existingValue) => {
        let suggestedPath = electronApp.getAppPath();
        if(existingValue){
            suggestedPath = existingValue;
        }
        let dialogResult = await dialog.showOpenDialog({
            title: "Select Data Directory",
            properties: ["openDirectory", "createDirectory", "dontAddToRecent", "promptToCreate"],
            defaultPath: suggestedPath,
        })

        return dialogResult.filePaths[0];
    });

    ipcMain.handle("settings:save", async (e, newSettings) => {
        saveSettings(newSettings);
        settings = newSettings;
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

    ipcMain.handle("repos:getBranchInfo", async (e, courseId: number, assignment: string, name: string) => {
        return app.repoController.getBranchInfo(courseId, assignment, name);
    });

    ipcMain.handle("repos:refresh", async (e, courseId: number, assignment: string, name: string) => {
        return app.repoController.refresh(courseId, assignment, name);
    });

    ipcMain.handle("repos:switchBranch", async (e, courseId: number, assignment: string, name: string, newBranch: string) => {
        return app.repoController.switchBranch(courseId, assignment, name, newBranch);
    });

    

    ipcMain.handle("repos:load", async (e, courseId: number, assignment: string, filter: RepoFilter) => {
        return app.repoController.loadRepos(courseId, assignment, filter);
    });

    ipcMain.handle("repostats:get", async (e, courseId: number, assignment: string, name: string, filter: StatsFilter): Promise<RepoStatisticsDTO> => {
        let mainResult = app.statisticsController.getRepoStats(courseId, assignment, name, filter);
        return mainResult;
    });

    ipcMain.handle("repostats-blame:get", async (e, courseId: number, assignment: string, name: string, filter: StatsFilter) => {
        return app.statisticsController.getBlameStats(courseId, assignment, name, filter);
    });

    ipcMain.handle("repostats-student:get", async (e, courseId: number, assignment: string, name: string, filter: StudentFilter) => {
        return app.statisticsController.getStatsByUser(courseId, assignment, name, filter);
    });

}