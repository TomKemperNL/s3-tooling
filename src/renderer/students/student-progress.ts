import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CourseDTO, StudentDTO } from '../../shared';


@customElement('student-progress')
export class StudentProgress extends LitElement {


    @property({ type: Object })
    student: StudentDTO;

    @property({ type: Object })
    course: CourseDTO;

    render() {
        return html`${this.student.name}'s progress page in ${this.course.name}`;
    }
}