declare global {
    interface Window {
        electron: ElectronIPC;
    }
}

export interface ElectronIPC {
    test: string,
    getCourses: () => Promise<any>
}


