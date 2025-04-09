import { getUsernameFromUrl } from "./canvas_client";
import { RepoResponse } from "./github_client";

type User = {
    name: string;
};

type Team = {
    members: User[];
    name: string;
}

export class Repo {
    name: string;
    api_url: string;
    ssh_url: string;
    http_url: string;

    constructor(public response: RepoResponse, private config: CourseConfig){
        this.name = response.name;
        this.api_url = response.url;
        this.ssh_url = response.ssh_url;
        this.http_url = response.html_url;
    }

    get isVerantwoordingRepo(){
        return this.name.startsWith(this.config.verantwoordingAssignmentName);
    }

    get owner(){
        return getUsernameFromUrl(this.http_url, this.config.verantwoordingAssignmentName);
    }

    get isProjectRepo(){
        return this.name.startsWith(this.config.projectAssignmentName);
    }
}

type Project = {
    name: string;
}

type Course = {
    name: string;
}

export type CourseConfig = {
    canvasCourseId: number;
    canvasVerantwoordingAssignmentId: number;
    canvasGroupsName: string;

    githubStudentOrg: string;
    verantwoordingAssignmentName: string;
    projectAssignmentName: string;
}

