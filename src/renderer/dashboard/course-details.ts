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

@customElement('course-details')
export class CourseDetails extends LitElement {

    @property({ type: Object })
    course: CourseDTO

    @property({ type: Boolean, state: true })
    loading = false;

    selectedSection: string = "";

    @consume({context: ipcContext})
    ipc: BackendApi

    constructor() {
        super();
    }

    sectionDropdownChange(e: HTMLInputEvent) {
        let selected = e.target.value;
        if (selected) {
            this.selectedSection = selected;
        }
    }

    async loadRepos(a: Assignment) {
        try {
            this.loading = true;
            let result = await this.ipc.loadRepos(this.course.canvasId, a.githubAssignment, { sections: [ this.selectedSection] })
            this.dispatchEvent(new ReposLoadedEvent(result));
        }
        catch (e) {
            alert(e);
        } finally {
            this.loading = false;
        }
    }

    assignmentDropdownChange(e: HTMLInputEvent) {
        let selected = e.target.value;
        if (selected) {
            let assignment = this.course.assignments.find(a => a.githubAssignment === selected);
            if (assignment) {
                this.loadRepos(assignment);
            }
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