import { RepoFilter, Settings, StatsFilter } from "./shared";

const { setupIpcPreloadHandlers } = require('./electron-setup');
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', Object.assign(setupIpcPreloadHandlers(), {
    startup: async () => {
        return ipcRenderer.invoke('startup');
    },
    openDirectory: async (currentPath?: string) => {
        return ipcRenderer.invoke('dialog:openDirectory', currentPath);
    },
    saveSettings: async (settings: Settings) => {
        return ipcRenderer.invoke('settings:save', settings);
    },
    loadSettings: async () => {
        return ipcRenderer.invoke('settings:load');
    },

    loadRepos: async (id: number, assignment: string, filter: RepoFilter) => {
        return ipcRenderer.invoke('repos:load', id, assignment, filter);
    },
    getRepoStats: async (courseId: number, assignment: string, name: string, filter: StatsFilter) => {
        let result = ipcRenderer.invoke('repostats:get', courseId, assignment, name, filter);
        return result;
    },
    getBlameStats: async (courseId: number, assignment: string, name: string, filter: StatsFilter) => {
        let result = ipcRenderer.invoke('repostats-blame:get', courseId, assignment, name, filter);
        return result;
    },
    getStudentStats: async (courseId: number, assignment: string, name: string, filter: StatsFilter) => {
        let result = ipcRenderer.invoke('repostats-student:get', courseId, assignment, name, filter);
        return result;
    },
    getBranchInfo: async (courseId: number, assignment: string, name: string) => {
        return ipcRenderer.invoke('repos:getBranchInfo', courseId, assignment, name);
    },
    refreshRepo: async (courseId: number, assignment: string, name: string) => {
        return ipcRenderer.invoke('repos:refresh', courseId, assignment, name);
    },
    switchBranch: async (courseId: number, assignment: string, name: string, newBranch: string) => {
        return ipcRenderer.invoke('repos:switchBranch', courseId, assignment, name, newBranch);
    }
}));