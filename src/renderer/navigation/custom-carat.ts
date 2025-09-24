import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

export type CaratDirection = "up" | "down" | "left" | "right";

@customElement("custom-carat")
export class CustomCarat extends LitElement {

    @property({ type: String })
    direction: CaratDirection = "down";

    @property({ type: String })
    color: string = "currentColor";

    static styles = css`
        :host {
            display: inline-block;
            width: 1em;
            height: 1em;
            vertical-align: middle;
        }
    `;
    

    render() {
        switch (this.direction) { 
            case "up": //ChatGPT kwam ineens met deze SVGs, we zien wel:)
                return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke=${this.color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-up"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
            case "down":
                return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke=${this.color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-down"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
            case "left":
                return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke=${this.color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-left"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
            case "right":
                return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke=${this.color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-right"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
        }
    }
}