import { html, LitElement } from "lit";
import { Assignment, CourseDTO, RepoDTO } from "../../shared";
import { customElement, property } from "lit/decorators.js";
import { map } from "lit/directives/map.js";
import { BackendApi } from "../../backend-api";
import { ipcContext } from "../contexts";
import { consume } from "@lit/context";
import { HTMLInputEvent } from "../events";

export class ReposLoadedEvent extends Event {
    constructor(public repos: RepoDTO[]) {
        super('repos-loaded')
    }
}

export class ReposClearedEvent extends Event {
    constructor() {
        super('repos-cleared')
    }
}

@customElement('course-details')
export class CourseDetails extends LitElement {

    @property({ type: Object })
    course: CourseDTO

    @property({ type: Boolean, state: true })
    loading = false;

    selectedSection: string = "";
    selectedAssignment: string = "";

    @consume({context: ipcContext})
    ipc: BackendApi

    constructor() {
        super();
    }
    
    sectionDropdownChange(e: HTMLInputEvent) {
        this.selectedSection = e.target.value;        

        if(this.selectedSection && this.selectedAssignment){
            this.loadRepos();
        }else{
            this.dispatchEvent(new ReposClearedEvent());
        }
    }

    assignmentDropdownChange(e: HTMLInputEvent) {
        this.selectedAssignment = e.target.value;

        if(this.selectedSection && this.selectedAssignment){
            this.loadRepos();
        }else{
            this.dispatchEvent(new ReposClearedEvent());
        }
    }


    async loadRepos() {
        try {
            this.loading = true;
            const result = await this.ipc.loadRepos(this.course.canvasId, this.selectedAssignment, { sections: [ this.selectedSection] })
            this.dispatchEvent(new ReposLoadedEvent(result));
        }
        catch (e) {
            alert(e);
        } finally {
            this.loading = false;
        }
    }


    render() {
        return html`          
            <h3>Secties</h3>
            <select ?disabled=${this.loading} @change=${this.sectionDropdownChange}>
                <option value="">Select a section</option>
                    ${map(Object.keys(this.course.sections), s => html`
                        <option value=${s}>${s}</option>
            `)}
            </select>
              
            <h3>Assignments</h3>
            <select ?disabled=${this.loading} @change=${this.assignmentDropdownChange}>
                <option value="">Select an assignment</option>
                ${map(this.course.assignments, a =>
            html`<option value=${a.githubAssignment}>${a.githubAssignment} </option>`)}
            </select>
        `
    }
}