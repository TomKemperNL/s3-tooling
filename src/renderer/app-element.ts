import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { CourseDTO } from "../core";
import { when } from "lit/directives/when.js";

@customElement("app-element")
export class AppElement extends LitElement {
    @property({type: Object})
    activeCourse: CourseDTO;



    render(){
        return html`
            <h1>Tooling</h1>
            <h2>Cursussen</h2>            
            <courses-list></courses-list>
            
            ${when(this.activeCourse, () => html`
                <h2>Cursus</h2>    
                <course-details .course=${this.activeCourse}></course-details>
            `)}
            


        `
    }
}