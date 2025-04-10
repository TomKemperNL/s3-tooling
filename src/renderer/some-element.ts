import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";

@customElement('some-element')
export class SomeElement extends LitElement {
    render(){
        return html`<p>Hello World</p>`
    } 
    
}