import { SectionResponse, SimpleDict } from "../../src/main/canvas_client";

export class FakeCanvasClient {

    sections: SectionResponse[] = [];
    async getSections(){
        return this.sections;
    }

    mapping: SimpleDict = {};
    async getGithubMapping(){
        return this.mapping;
    }
}