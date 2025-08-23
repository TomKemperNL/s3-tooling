import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { when } from "lit/directives/when.js";

@customElement("login-element")
export class LoginElement extends LitElement {
    @property({ type: String })
    username: string;
        
    constructor() {
        super();
        this.username = null; 
    }

    static styles = css`
        `;

    refresh(){
        return fetch('/auth/session').then(r => r.json()).then((data: any) => {
            this.username = data.user ? data.user.username : null;
        });  
    }

    protected firstUpdated(_changedProperties: PropertyValues): void {
        this.refresh();
    }

    logout(){
        return fetch('/auth/session', {
            method: 'DELETE'          
        }).then(() => {
            this.refresh();
        })      
    }

    render() {
        return html`
        ${when(this.username, () => html`
            Hello ${this.username}
            <button @click=${this.logout}>Logout</button>
        `, () => html`
            Hello guest
            <button @click=${() => window.location.href = '/auth/github'}>Login with GitHub</button>
        `)}
        `
    }
}