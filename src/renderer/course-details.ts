import { html, LitElement } from "lit";
import { Assignment, CourseDTO, RepoDTO } from "../core";
import { customElement, property } from "lit/decorators.js";
import { map } from "lit/directives/map.js";
import { ElectronIPC } from "./ipc";

export class ReposLoadedEvent extends Event{    
    constructor(public repos: RepoDTO[]){
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
    ipc: ElectronIPC

    constructor() {
        super();
        this.ipc = window.electron;
    }

    changeSelection(section: string) {
        return (e) => {
            if (e.target.checked) {
                this.selectedSections.push(section);
            } else {
                this.selectedSections.splice(this.selectedSections.indexOf(section), 1);
            }
        };
    }

    loadRepos(a: Assignment) {
        return async () => {
            try {
                this.loading = true;
                let result = await this.ipc.loadRepos(this.course.canvasId, a.name, { sections: this.selectedSections })
                this.dispatchEvent(new ReposLoadedEvent(result));
            } finally {
                this.loading = false;
            }
        };
    }

    render() {
        return html`
            <h2>${this.course.name}</h2>           
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
            <ul>
                ${map(this.course.assignments, a => html`<li>${a.name} <button @click=${this.loadRepos(a)} ?disabled=${this.loading} type="button">Load Repositories</button></li>`)}
            </ul>
        `
    }
}