import { html, LitElement } from "lit";
import { Assignment, CourseDTO, RepoDTO } from "../shared";
import { customElement, property } from "lit/decorators.js";
import { map } from "lit/directives/map.js";
import { BackendApi } from "../backend-api";
import { ipcContext } from "./contexts";
import { consume } from "@lit/context";
import { HTMLInputEvent } from "./events";

export class ReposLoadedEvent extends Event {
    constructor(public repos: RepoDTO[]) {
        super('repos-loaded')
    }
}

@customElement('course-details')
export class CourseDetails extends LitElement {

    @property({ type: Object })
    course: CourseDTO

    @property({ state: true })
    loading = false;

    selectedSections: string[] = [];

    @consume({context: ipcContext})
    ipc: BackendApi

    constructor() {
        super();
    }

    changeSelection(section: string) {
        return (e: HTMLInputEvent) => {
            if (e.target.checked) {
                this.selectedSections.push(section);
            } else {
                this.selectedSections.splice(this.selectedSections.indexOf(section), 1);
            }
        };
    }

    async loadRepos(a: Assignment) {
        try {
            this.loading = true;
            let result = await this.ipc.loadRepos(this.course.canvasId, a.githubAssignment, { sections: this.selectedSections })
            this.dispatchEvent(new ReposLoadedEvent(result));
        }
        catch (e) {
            alert(e);
        } finally {
            this.loading = false;
        }
    }

    dropdownChange(e: HTMLInputEvent) {
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
            <ul>
                ${map(Object.keys(this.course.sections), k => html`
                    <li><details><summary><input type="checkbox" @change=${this.changeSelection(k)} />${k}</summary>
                        <ul>
                            ${map(this.course.sections[k], s => html`
                                <li>${s.name} - ${s.email}</li>
                            `)}
                        </ul>
                    </details></li>
                `)}
            </ul>
            <h3>Assignments</h3>
            <select ?disabled=${this.loading} @change=${this.dropdownChange}>
                <option value="">Select an assignment</option>
                ${map(this.course.assignments, a =>
            html`<option value=${a.githubAssignment}>${a.githubAssignment} </option>`)}
            </select>
        `
    }
}