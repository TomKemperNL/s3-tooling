import { AssignmentResponse, SectionResponse, SimpleDict, SubmissionResponse } from "../../../src/main/canvas-client";

export class FakeCanvasClient {
    apiCalls = 0;

    sections: SectionResponse[] = [];
    async getSections(){
        this.apiCalls++;
        return this.sections;
    }

    mapping: SimpleDict = {};
    async getGithubMapping(){
        this.apiCalls++;
        return this.mapping;
    }

    assignments: AssignmentResponse[] = [];
     async getAssignments(course: { course_id: number }): Promise<AssignmentResponse[]> {
        return this.assignments;
    }

    submissions: SubmissionResponse[] = [];
    async getAllSubmissionsForStudent(params: { course_id: number, student_id: number }) : Promise<SubmissionResponse[]> {  
        return this.submissions;
    }
}