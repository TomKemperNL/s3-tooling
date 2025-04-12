import { ipcRenderer } from "electron";

const { contextBridge } = require('electron')


contextBridge.exposeInMainWorld('electron', {
    'test': 'Hello World',
    'getCourses': async () => {
        return ipcRenderer.invoke('courses:get');
    }
});