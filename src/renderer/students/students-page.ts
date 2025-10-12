import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { CourseDTO, StudentDetailsDTO } from "../../shared";
import { BackendApi } from "../../backend-api";
import { consume } from "@lit/context";
import { ipcContext } from "../contexts";
import { map } from "lit/directives/map.js";

@customElement("students-page")
export class StudentsPage extends LitElement {

    @consume({ context: ipcContext })
    api: BackendApi

    @property({ type: Object })
    course: CourseDTO

    @property({ type: String })
    section: string = null;

    @property({ type: Array, state: true })
    students: StudentDetailsDTO[] = [];

    @property({ type: Array, state: true })
    missing: string[] = [];


    updated(changedProperties: Map<string, any>) {
        if (changedProperties.has('course')) {
            this.api.getStudents(this.course.canvasId).then(res => {
                this.students = res.students;
                this.missing = res.missing;
            });
        }
    }


    render() {
        let students = this.students;
        if (this.section) {
            students = this.students.filter(s => s.sections.includes(this.section));
        }
        return html`
        <h2>Students</h2>

        <p>Missing usernames: ${this.missing.join(',')}</p>

        <table>
            <thead>
                <tr>
                    <th>Section</th>
                    <th>Student</th>
                    <th>Email</th>
                    <th>Username</th>
                    <th>Aliases</th>
                </tr>
            </thead>
            <tbody>
                ${map(students, (s) => html`
                        <tr>
                            <td><ul>${map(s.sections, (sec) => html`<li>${sec}</li>`)}</ul></td>
                            <td>${s.name}</td>
                            <td><a href="mailto:${s.email}">${s.email}</a></td>
                            <td>
                                ${Object.keys(s.identities).join(', ')}
                            </td>
                            <td>
                                ${Object.values(s.identities).join(', ')}
                            </td>
                        </tr>                    
                    `)}                
            </tbody>
        </table>
        `;
    }

}