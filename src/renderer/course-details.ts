import { html, LitElement } from "lit";
import { CourseDTO } from "../core";
import { customElement, property } from "lit/decorators.js";
import { map } from "lit/directives/map.js";

@customElement('course-details')
export class CourseDetails extends LitElement {

    @property({type: Object})
    course: CourseDTO

    render(){
        return html`
            <h2>${this.course.name}</h2>
            <h3>Assignments</h3>
            <ul>
                ${map(this.course.assignments, a => html`<li>${a}</li>`)}
            </ul>
            <h3>Secties</h3>
            <ul>
                ${map(Object.keys(this.course.sections), k => html`
                    <li>${k}
                        <ul>
                            ${map(this.course.sections[k], s => html`
                                <li>${s.name} - ${s.email}</li>
                            `)}
                        </ul>
                    </li>
                `)}
            </ul>
        `
    }
}