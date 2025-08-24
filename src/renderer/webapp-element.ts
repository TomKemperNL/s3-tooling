import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import createRouter from './web/router'
import { provide } from "@lit/context";
import { ipcContext } from "./contexts";
import { BackendApi } from "../backend-api";
import { WebBackend } from "./web/web-backend";

@customElement("webapp-element")
export class WebAppElement extends LitElement {

    @provide({ context: ipcContext})
    ipc: BackendApi;
        
    constructor() {
        super();
        this.ipc = new WebBackend();
    }

    connectedCallback(): void {
        super.connectedCallback();
     
    }

    protected firstUpdated(_changedProperties: PropertyValues): void {
        let outlet = this.shadowRoot.getElementById('outlet');
        createRouter(outlet);
    }

    render() {
        return html`
        <login-element></login-element>
        <div id="outlet"></div>
        `
    }
}