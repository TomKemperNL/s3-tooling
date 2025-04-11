
const { contextBridge } = require('electron')

declare global {
    interface Window {
        electron: any;
    }
}

contextBridge.exposeInMainWorld('electron', {
    'test': 'Hello World'
});