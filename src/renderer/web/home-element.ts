import { LitElement } from "lit";
import { customElement } from "lit/decorators.js";


@customElement("home-element")
export class HomeElement extends LitElement {
    constructor() {
        super();
    }

    render() {
        return `
            <div>
                <h1>S3 tooling</h1>
                <p>Heavily under construction;)</p>
            </div>
        `;
    }
}