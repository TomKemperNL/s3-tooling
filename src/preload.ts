import { ipcRenderer } from "electron";
const { contextBridge } = require('electron')


contextBridge.exposeInMainWorld('electron', {
    test: 'Hello World',
    startup: async () => {
        return ipcRenderer.invoke('startup');
    },
    openDirectory: async (currentPath?: string) => {
        return ipcRenderer.invoke('dialog:openDirectory', currentPath);
    },
    saveSettings: async (settings) => {
        return ipcRenderer.invoke('settings:save', settings);
    },
    loadSettings: async () => {
        return ipcRenderer.invoke('settings:load');
    },
    getCourses: async () => {
        return ipcRenderer.invoke('courses:get');
    },
    loadCourse: async (id) => {
        return ipcRenderer.invoke('course:load', id);
    },
    loadRepos: async (id, assignment, filter) => {
        return ipcRenderer.invoke('repos:load', id, assignment, filter);
    },
    getRepoStats: async(courseId, assignment, name, filter) => {
        let result = ipcRenderer.invoke('repostats:get', courseId, assignment, name, filter);
        return result;
    },
    getBlameStats: async(courseId, assignment, name, filter) => {
        let result = ipcRenderer.invoke('repostats-blame:get', courseId, assignment, name, filter);
        return result;
    },
    getStudentStats: async(courseId, assignment, name, filter) => {
        let result = ipcRenderer.invoke('repostats-student:get', courseId, assignment, name, filter);
        return result;
    },
    getBranchInfo: async (courseId, assignment, name) => {
        return ipcRenderer.invoke('repos:getBranchInfo', courseId, assignment, name);
    },
    refreshRepo: async (courseId, assignment, name) => {
        return ipcRenderer.invoke('repos:refresh', courseId, assignment, name);
    },
    switchBranch: async (courseId, assignment, name, newBranch) => {
        return ipcRenderer.invoke('repos:switchBranch', courseId, assignment, name, newBranch);
    }
});