import { CourseConfig, CourseDTO } from "../core";

declare global {
    interface Window {
        electron: ElectronIPC;
    }
}

export interface ElectronIPC {
    test: string,
    getCourses: () => Promise<CourseConfig[]>
    loadCourse: (id: number) => Promise<CourseDTO>
}


