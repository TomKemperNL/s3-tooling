import { provide } from "@lit/context";
import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ipcContext } from "./contexts";
import { BackendApi, BackendEvents } from "../backend-api";

@customElement('screenshot-element')
export class ScreenShotElement extends LitElement {

    
    @provide({ context: ipcContext})    
    ipc: BackendApi & BackendEvents;
    

    constructor(){
        super();
        this.ipc = window.electron;
    }

    @property({ type: String })
    message: string = 'Before';

    user: string;

    connectedCallback(): void {
        super.connectedCallback();
        this.ipc.onLoadUserStats((data: { organisation: string, repository: string, user: string }) => {
            this.message += ` ${data.organisation} - ${data.repository} - ${data.user}`; 
            this.user = data.user;
        });

    }


    protected firstUpdated(_changedProperties: PropertyValues): void {
        setTimeout(async () => {
            this.message += 'After';
            await this.ipc.requestScreenshot(`${this.user}-screenshot`);
            // window.close();
        }, 3500)
    }

    render() {
        return html`
        <repository-details .repo=${this.repo} .authorFilter=${[this.author]} ></repository-details>
        Hello ${this.message}
        `;
        
    }
}