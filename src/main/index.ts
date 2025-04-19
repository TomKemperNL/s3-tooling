import { GithubClient } from "./github_client";
import { FileSystem } from "./filesystem_client";
import { CanvasClient } from "./canvas_client";

import { RepoDTO, RepoFilter, RepoStatisticsDTO, StatsFilter } from "./../core";
import { ipcMain } from 'electron';

const githubClient = new GithubClient();
const fileSystem = new FileSystem();
const canvasClient = new CanvasClient();

import { db } from "./db";
import { ReposController } from "./repos/reposController";
import { CoursesController } from "./courses/coursesController";
if(!process.env.KEEP_DB) {
    db.reset().then(() => db.test());
}else{
    console.log('keeping db');
}

const repoController = new ReposController(db, canvasClient, githubClient, fileSystem);
const coursesController = new CoursesController(db, canvasClient);

export async function main() {
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
        return repoController.getRepoStats(courseId, assignment, name, filter);
    });
    
}