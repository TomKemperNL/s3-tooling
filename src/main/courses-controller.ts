import { CourseConfig, CourseDTO } from "../shared";
import { CanvasClient } from "./canvas-client";
import { Db } from "./db";
import { ipc } from "../electron-setup";
import { CourseApi } from "../backend-api";

function get(path: string = ''){
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        
    };
}


export class CoursesController implements CourseApi {
    constructor(private db: Db, private canvasClient: CanvasClient){
        
    }

    @get('/courses')
    @ipc('courses:get')
    async getCourses(): Promise<CourseConfig[]> {
        return this.db.getCourseConfigs();
    }

    @ipc('course:load')
    async loadCourse(id: number): Promise<CourseDTO> {
        let savedCourse = await this.db.getCourse(id);
        if (Object.keys(savedCourse.sections).length === 0) {
            let sections = await this.canvasClient.getSections({ course_id: id });
            for (let section of sections) {
                if (section.name === savedCourse.name) {
                    continue; //Elke cursus heeft zo'n sectie waar 'iedereen' in zit. Die lijkt me niet handig?
                }
                if(!section.students){
                    continue; //Soms heeft een sectie geen studenten? Dan returnt de client null ipv. een []
                }
                savedCourse.sections[section.name] = section.students.map(s => ({
                    name: s.name,
                    studentId: parseInt(s.sis_user_id),
                    email: s.login_id
                }));
            }

            await this.db.updateSections(savedCourse);
        }

        return savedCourse;
    }
}