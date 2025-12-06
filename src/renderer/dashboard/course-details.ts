import { html, LitElement } from "lit";
import { Assignment, CourseDTO, RepoDTO } from "../../shared";
import { customElement, property } from "lit/decorators.js";
import { map } from "lit/directives/map.js";
import { BackendApi } from "../../backend-api";
import { ipcContext } from "../contexts";
import { consume } from "@lit/context";
import { HTMLInputEvent } from "../events";
import { NavigationRequestedEvent } from "../navigation/events";

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

export class SectionSelectedEvent extends Event {
    constructor(public section: string) {
        super('section-selected')
    }
}

export class DetailsSelectedEvent extends Event {
    constructor(public section: string, public assignment: string) {
        super('details-selected')
    }
}

const allSections = "All";

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
        this.dispatchEvent(new SectionSelectedEvent(this.selectedSection));
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
            let sections = this.selectedSection === allSections ? [] : [ this.selectedSection];
            const result = await this.ipc.loadRepos(this.course.canvasId, this.selectedAssignment, { sections })
            this.dispatchEvent(new DetailsSelectedEvent(this.selectedSection === allSections ? null : this.selectedSection, this.selectedAssignment));
            this.dispatchEvent(new ReposLoadedEvent(result));
        }
        catch (e) {
            alert(e);
        } finally {
            this.loading = false;
        }
    }

    goToSectionOverview() {
        this.dispatchEvent(new NavigationRequestedEvent("section"));
    }

    render() {
        
        let renderSections = Object.keys(this.course.sections).concat([allSections]).sort();

        return html`          
            <h3>Secties</h3>
            <custom-carat></custom-carat>
            <select ?disabled=${this.loading} @change=${this.sectionDropdownChange}>
                <option value="">Select a section</option>
                    ${map(renderSections, s => html`
                        <option value=${s}>${s}</option>
            `)}
            </select>
              
            <h3>Assignments</h3>
            <custom-carat></custom-carat>
            <div>
                <select ?disabled=${this.loading} @change=${this.assignmentDropdownChange}>
                    <option value="">Select an assignment</option>
                    ${map(this.course.assignments, a =>
                html`<option value=${a.name}>${a.name} </option>`)}
                </select>
                <custom-carat style="cursor:pointer" @click=${this.goToSectionOverview} direction="right" color="red"></custom-carat>
            </div>
        `
    }
}