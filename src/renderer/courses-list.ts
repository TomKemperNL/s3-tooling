import { LitElement, PropertyValues, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import { map } from "lit/directives/map.js";
import { ElectronIPC } from "./ipc.ts";
import { CourseDTO } from "../core.ts";
import { consume } from "@lit/context";
import { ipcContext } from "./contexts.ts";

export class CourseLoadedEvent extends Event {
    constructor(public course: CourseDTO) {
        super('course-loaded');
    }
}

@customElement('courses-list')
export class CoursesList extends LitElement {

    constructor() {
        super();
        this.courses = []
    }

    @consume({context: ipcContext})
    ipc: ElectronIPC

    @property({ type: Array, state: true })
    courses: any[];

    @property({ type: Boolean, state: true })
    loading: boolean = false;

    protected firstUpdated(_changedProperties: PropertyValues): void {
        this.ipc.getCourses().then(r => {
            this.courses = r;
        });
    }

    async loadCourse(c) {
        this.loading = true;
        try {
            let result = await this.ipc.loadCourse(c.canvasCourseId);
            if (result) {
                this.dispatchEvent(new CourseLoadedEvent(result));
            }
        }
        finally { this.loading = false; }
    };

    dropdownChange(e) {
        let selected = e.target.value;
        if (selected) {
            let course = this.courses.find(c => c.name === selected);
            if (course) {
                this.loadCourse(course);
            }
        }
    }

    render() {
        return html`            
            <select ?disabled=${this.loading} @change=${this.dropdownChange}>
                <option value="">Select a course</option>
            ${map(this.courses, c => html`
                <option value=${c.name}>${c.name}</option>`)}                
            </select>`
    }

}