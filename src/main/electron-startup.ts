import { ipcMain, dialog, app as electronApp } from 'electron';
import { RepoFilter, RepoStatisticsDTO, StatsFilter, StudentFilter } from '../shared';
import { S3App } from '.';
import { saveSettings, loadSettings } from "./settings";

import { existsSync } from "fs";

let decoratorRegistry : {[channel: string]: any}= {};

export function ipc(channel: string){
    return function(target:any, propertyKey: string, descriptor: PropertyDescriptor){
        console.log('registering ipc handler for channel:', channel, 'on', target.constructor.name, propertyKey);
        decoratorRegistry[channel] = {
            handler: descriptor.value,
            target
        };
    }
}

export function setupIpcHandlers(app: S3App ) {
    let appAsAny = <any> app;

    for(let channel of Object.keys(decoratorRegistry)){        
        ipcMain.handle(channel, function(e, ...args){            
            console.log('args:', args);
            let entry = decoratorRegistry[channel];
            let owningObject = app;
            for(let key of Object.keys(app)){
                if(entry.target.constructor === appAsAny[key].constructor){
                    owningObject = appAsAny[key];
                    break;
                }
            }
            return entry.handler.apply(owningObject, args);
        });
    }

    ipcMain.handle("startup", async (e) => {
        let settings = app.settings;

        let allSettings = !!settings.canvasToken && !!settings.githubToken && !!settings.dataPath;
        if(allSettings){
            return {
                validSettings: existsSync(settings.dataPath),
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
        await app.reload(newSettings);
    });

    ipcMain.handle("settings:load", async (e) => {
        return loadSettings();
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