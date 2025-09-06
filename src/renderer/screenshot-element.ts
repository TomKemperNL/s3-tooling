import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement('screenshot-element')
export class ScreenShotElement extends LitElement {

    ipc: any;
    

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
        Hello ${this.message}
        `;
        
    }
}