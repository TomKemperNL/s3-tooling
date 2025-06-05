import { CourseConfig, CourseDTO } from "./../core";
import { CanvasClient } from "./canvas_client";
import { Db } from "./db";

export class CoursesController{
    constructor(private db: Db, private canvasClient: CanvasClient){
        
    }

    async getConfigs(): Promise<CourseConfig[]> {
        return this.db.getCourseConfigs();
    }

    async loadCourse(id): Promise<CourseDTO> {
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
                console.log(section);
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