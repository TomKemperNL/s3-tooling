import { ipcRenderer } from "electron";
import { get } from "http";

const { contextBridge } = require('electron')


contextBridge.exposeInMainWorld('electron', {
    test: 'Hello World',
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
        console.log('getStudentStats', courseId, assignment, name, filter);
        let result = ipcRenderer.invoke('repostats-student:get', courseId, assignment, name, filter);
        return result;
    }
});