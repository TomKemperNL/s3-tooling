import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { CourseDTO } from "../../shared";
import { BackendApi } from "../../backend-api";
import { consume } from "@lit/context";
import { ipcContext } from "../contexts";

@customElement("students-page")
export class StudentsPage extends LitElement {

    @consume({context: ipcContext})
    api: BackendApi

    @property({type: Object})
    course: CourseDTO

    @property({type: String})
    section: string = null;


    updated(changedProperties: Map<string, any>) {
        if (changedProperties.has('course') || changedProperties.has('section')) {
            
        }
    }
    

    render(){        
        let sections = this.course.sections;
        if(this.section){
            sections = { [this.section]: this.course.sections[this.section] };
        }

        return html`
        <h2>Students</h2>

        <table>
            <thead>
                <tr>
                    <th>Section</th>
                    <th>Student</th>
                    <th>Email</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(sections).map(([section, students]) => 
                    students.map(student => html`
                        <tr>
                            <td>${section}</td>
                            <td>${student.name}</td>
                            <td><a href="mailto:${student.email}">${student.email}</a></td>                            
                        </tr>                    
                    `)
                )}
            </tbody>
        </table>
        `;
    }

}