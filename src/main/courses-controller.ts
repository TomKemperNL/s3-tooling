import { CourseConfig, CourseDTO } from "../shared";
import { CanvasClient } from "./canvas-client";
import { Db } from "./db";
import { ipc } from "../electron-setup";
import { CourseApi } from "../backend-api";
import { get, path } from "../web-setup";

export class CoursesController implements CourseApi {
    constructor(private db: Db, private canvasClient: CanvasClient){
        
    }
    
    @ipc('courses:get')
    async getCourses(): Promise<CourseConfig[]> {
        return this.db.getCourseConfigs();
    }

    @ipc('course:load')
    async loadCourse(@path(":id") id: number): Promise<CourseDTO> {
        const savedCourse = await this.db.getCourse(id);
        if (Object.keys(savedCourse.sections).length === 0) {
            const sections = await this.canvasClient.getSections({ course_id: id });
            for (const section of sections) {
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