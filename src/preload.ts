import { ScreenshotArgs } from "./backend-api";
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
    requestScreenshot: async (name: string) => {
        return ipcRenderer.invoke('request:screenshot', name);
    },
    onLoadUserStats: (callback: (data: ScreenshotArgs) => void) => ipcRenderer.on('load-user-stats', (event: any, data: ScreenshotArgs) => {
        console.log("Received load-user-stats", data);

        callback(data);
    })
}));