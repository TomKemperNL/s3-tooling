import { CourseConfig, CourseDTO, StudentDetailsDTO, StudentDetailsResult } from "../shared";
import { CanvasClient } from "./canvas-client";
import { Db } from "./db";
import { ipc } from "../electron-setup";
import { CourseApi } from "../backend-api";
import { path } from "../web-setup";
import { readUsedSize } from "chart.js/helpers";

export class CoursesController implements CourseApi {
    constructor(private db: Db, private canvasClient: CanvasClient) {

    }

    @ipc('courses:get')
    async getCourses(): Promise<CourseConfig[]> {
        return this.db.getCourseConfigs();
    }

    @ipc('course:students:get')
    async getStudents(courseId: number): Promise<StudentDetailsResult> {
        let savedCourse = await this.db.getCourse(courseId);
        let users = await this.db.getGHUserToStudentMailMapping(courseId);
        let repos = await this.db.selectReposByCourse(courseId);

        let results: StudentDetailsDTO[] = [];        
        for (let section of Object.keys(savedCourse.sections)) {
            for (let student of savedCourse.sections[section]) {
                let found = results.find(s => s.studentId === student.studentId);
                if(!found){
                    found = {
                        name: student.name,
                        email: student.email,
                        studentId: student.studentId,
                        sections: [],
                        identities: {}
                    };
                    results.push(found);
                }
                
                found.sections.push(section);
                let identities = Object.entries(users).filter(([gh, mail]) => mail === student.email).map(([gh, mail]) => gh);
                for (let id of identities) {
                    if (!found.identities[id]) {
                        found.identities[id] = [];
                    }
                }
            }
        }
        
        let missing : string[] = [];
        let conflicting : { username: string, students: string[] }[]= [];
        let allIdentities = {} as Record<string, string[]>;

        
        for (let r of repos) {
            let authorMapping = await this.db.getAuthorMapping(r.organization.login, r.name);
            
            let identities : Record<string,string[]> = Object.entries(authorMapping).reduce((prev : Record<string,string[]>, [alias, canonical]) => {
                prev[canonical] = prev[canonical] || [];
                prev[canonical].push(alias);
                return prev
            }, {});


            for(let username of Object.keys(identities)){
                allIdentities[username] = allIdentities[username] || [];
                allIdentities[username].push(...identities[username]);
            }

            let collaborators = await this.db.getCollaborators(r.organization.login, r.name);
            for(let c of collaborators){
                if(!identities[c.login]){
                    missing.push(c.login);
                }
            }
        }

        for(let u of Object.keys(allIdentities)){
            let found = results.filter(s => Object.keys(s.identities).includes(u));
            if(found.length === 1){
                for(let a of allIdentities[u]){
                    found[0].identities[u].push(a);
                }                
            }else if(found.length === 0){
                missing.push(u);             
            } else if(found.length > 1){
                conflicting.push({ username: u, students: found.map(f => f.email )})
            }
        }

        return {
            students: results,
            missing: missing,
            conflicting: conflicting
        };

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
                if (!section.students) {
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