import { LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement('author-details')
export class AuthorDetails extends LitElement {

    @property({ type: String })
    author: string = '';

    static styles = [
        // Add your CSS styles here
    ];

    constructor() {
        super();
    }

    render() {
        return null;
    }
}