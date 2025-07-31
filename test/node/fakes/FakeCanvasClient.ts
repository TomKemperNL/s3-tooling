import { SectionResponse, SimpleDict } from "../../../src/main/canvas-client";

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
}