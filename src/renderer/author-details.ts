import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement('student-details')
export class StudentDetails extends LitElement {
    @property({ type: Object })
    authorStats: any;

    render() {
        return html`
            <h3>Author Details</h3>
            ${JSON.stringify(this.authorStats)}
        `;
    }
}