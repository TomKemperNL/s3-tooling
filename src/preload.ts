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
    }
}));