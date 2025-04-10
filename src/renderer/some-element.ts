import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { s2 } from "../temp"

@customElement('some-element')
export class SomeElement extends LitElement {
    render(){
        console.log(s2.canvasGroupsName);
        return html`<p>Hello World</p>`
    } 
    
}