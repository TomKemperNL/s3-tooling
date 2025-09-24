import { CourseConfig, CourseDTO } from "../../../src/shared";

export class FakeCoursesController {
    
    async getCourses(): Promise<CourseConfig[]> {
        return Promise.resolve([])
    }


    courseDTO: CourseDTO;
    async loadCourse(id: number): Promise<CourseDTO> {
        return Promise.resolve(this.courseDTO);
    }
}