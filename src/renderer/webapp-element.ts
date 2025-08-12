import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("webapp-element")
export class WebAppElement extends LitElement {

    
    constructor() {
        super();

    }

    static styles = css`
        `;

    render() {
        return html`
        Mah webapp
        `
    }
}