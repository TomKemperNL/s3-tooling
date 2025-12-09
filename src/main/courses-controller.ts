import { CourseConfig, CourseDTO, CriteriaDTO, ProgressResult, StudentDetailsDTO, StudentDetailsResult } from "../shared";
import { CanvasClient, UserResponse } from "./canvas-client";
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

    @ipc('course:student:progress')
    async getStudentProgress(courseId: number, studentCanvasId: number) : Promise<ProgressResult> {
        const savedCourse = await this.db.getCourseConfig(courseId);
        if (!savedCourse.canvasOverview) {
            return { callouts:[], overviews: []};
        }

        let [assignments, submissions] = await Promise.all([
            this.canvasClient.getAssignments({ course_id: savedCourse.canvasId }),
            this.canvasClient.getAllSubmissionsForStudent({ course_id: savedCourse.canvasId, student_id: studentCanvasId })]);

        let comments = submissions.flatMap(s => s.submission_comments);
        let commentsWithCallouts = comments.filter(c => c.comment && c.comment.indexOf('@') !== -1).map(c => ({
            author: c.author_name,
            comment: c.comment
        }));

        let overviews: any[] = [];
        let graders : Record<number, UserResponse> = {};
        for (let overview of savedCourse.canvasOverview) {
            let overviewData = {
                title: overview.title,
                criteria: [] as CriteriaDTO[]
            };

            for (let assignmentId of overview.assignments) {
                let assignment = assignments.find(a => a.id === assignmentId);
                if (assignment) {
                    let submissionsForAssignment = submissions.filter(s => s.assignment_id === assignment.id);
                    
                    for (let rubric of assignment.rubric || []) {                        
                        let existingCriterion = overviewData.criteria.find(c => c.description === rubric.description);
                        if (!existingCriterion) {
                            existingCriterion = {
                                description: rubric.description,
                                points: rubric.points,
                                levels: [],
                                results: []        
                            }
                            overviewData.criteria.push(existingCriterion);
                        }else {
                            existingCriterion.points = Math.max(existingCriterion.points, rubric.points);
                        };
                        
                        for (let rating of rubric.ratings) {
                            let existingLevel = existingCriterion.levels.find((l: any) => l.points === rating.points);
                            if (!existingLevel) {
                                existingCriterion.levels.push({
                                    points: rating.points,
                                    description: rating.description
                                });
                            } else {
                                if (existingLevel.description !== rating.description) {
                                    existingLevel.description += "/" + rating.description;
                                }
                            }                            
                        }

                        for (let submission of submissionsForAssignment) {
                            if(!graders[submission.grader_id] && submission.grader_id){
                                graders[submission.grader_id] = await this.canvasClient.getUserByCanvasId({ course_id: savedCourse.canvasId, user_id: submission.grader_id });
                            }

                            if (submission.rubric_assessment && submission.rubric_assessment[rubric.id]) {
                                let graderName = graders[submission.grader_id]?.short_name;
                                // if(!graderName){
                                //     console.log(`Could not find grader name for assignment ${assignment.id} submission ${submission.id} for user ${submission.user_id} and grader id ${submission.grader_id} on course ${savedCourse.canvasId}`);
                                // }
                                existingCriterion.results.push({
                                    points: submission.rubric_assessment[rubric.id].points,
                                    comments: submission.rubric_assessment[rubric.id].comments,
                                    assignmentName: assignment.name,
                                    grader: graderName,
                                    submitted_at: submission.submitted_at
                                });
                            }
                            

                        }
                    }
                }
            }

            overviews.push(overviewData);
        }

        return {
            callouts: commentsWithCallouts,
            overviews
        }
    }

    @ipc('course:students:get')
    async getStudents(courseId: number): Promise<StudentDetailsResult> {
        let savedCourse = await this.db.getCourse(courseId);
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        let users = await this.db.getGHUserToStudentMailMapping(courseId);
        let repos = await this.db.selectReposByCourse(courseId);

        let results: StudentDetailsDTO[] = [];        
        let allIdentities : Record<string,string[]> = {};
        for (let section of Object.keys(savedCourse.sections)) {
            for (let student of savedCourse.sections[section]) {
                let found = results.find(s => s.studentId === student.studentId);
                if (!found) {
                    found = {
                        name: student.name,
                        email: student.email,
                        studentId: student.studentId,
                        canvasId: student.canvasId,
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
                    allIdentities[id] = [];
                }
            }
        }
        
        let missing : string[] = [];
        let conflicting : { username: string, students: string[] }[]= [];        

        let authorMapping = await this.db.getAuthorMappingOrg(savedCourseConfig.githubStudentOrg);

        Object.entries(authorMapping).reduce((prev : Record<string,string[]>, [alias, canonical]) => {
                prev[canonical] = prev[canonical] || [];
                prev[canonical].push(alias);
                return prev
            }, allIdentities);

        for (let r of repos) {
            let collaborators = await this.db.getCollaborators(r.organization.login, r.name);
            for(let c of collaborators){
                if(!allIdentities[c.login]){
                    console.log(`Missing identity for collaborator ${c.login} on repo ${r.organization.login}/${r.name}`);
                    missing.push(c.login);
                }
            }
        }

        for (let u of Object.keys(allIdentities)) {
            let found = results.filter(s => Object.keys(s.identities).includes(u));
            if (found.length === 1) {
                for (let a of allIdentities[u]) {
                    found[0].identities[u].push(a);
                }                
            }else if(found.length === 0){
                console.log(`Missing student for identity ${u}`);
                missing.push(u);             
            } else if(found.length > 1){
                conflicting.push({ username: u, students: found.map(f => f.email )})
            }
        }

        return {
            students: results,
            missing: Array.from(new Set(missing)),
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
                    email: s.login_id,
                    canvasId: s.id
                }));
            }
            await this.db.updateSections(savedCourse);
        }

        return savedCourse;
    }
}