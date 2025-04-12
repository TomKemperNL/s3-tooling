import { LitElement, PropertyValues, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { s2 } from "../temp"
import { map } from "lit/directives/map.js";
import("./ipc.ts")



@customElement('courses-list')
export class CoursesList extends LitElement {
    
    constructor(){
        super();
        this.courses = []
    }

    @property()
    courses: any[];

    protected firstUpdated(_changedProperties: PropertyValues): void {
        window.electron.getCourses().then(r => {
            this.courses = r;
        });
    }

    render(){
        return html`
            <p>Hello World</p>
            <ul>
            ${map(this.courses, c => html`
                <li>${c.name}</li>
                `)}
            </ul>`
    } 
    
}