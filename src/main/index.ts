import { GithubClient } from "./github_client";
import { FileSystem } from "./filesystem_client";
import { CanvasClient } from "./canvas_client";

import { RepoDTO, RepoFilter, RepoStatisticsDTO, StatsFilter } from "./../core";
import { ipcMain } from 'electron';

const githubClient = new GithubClient();
const fileSystem = new FileSystem();
const canvasClient = new CanvasClient();

import { db } from "./db";
db.reset().then(() => db.test());
import { AppFacade } from "./appFacade";

const facade = new AppFacade(githubClient, canvasClient, fileSystem, db);

export async function main() {
    ipcMain.handle("courses:get", () => {
        return facade.getConfigs();
    });

    ipcMain.handle("course:load", async (e, id) => {
        return facade.loadCourse(id);
    });

    ipcMain.handle("repos:load", async (e, courseId: number, assignment: string, filter: RepoFilter) => {
       return facade.loadRepos(courseId, assignment, filter);
    });

    ipcMain.handle("repostats:get", async (e, courseId: number, assignment: string, name: string, filter: StatsFilter) : Promise<RepoStatisticsDTO> => {
        return facade.getRepoStats(courseId, assignment, name, filter);
    });
}