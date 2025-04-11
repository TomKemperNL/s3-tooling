
const { contextBridge } = require('electron')


contextBridge.exposeInMainWorld('electron', {
    'test': 'Hello World'
});