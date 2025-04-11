import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { s2 } from "../temp"
import("./ipc.ts")



@customElement('some-element')
export class SomeElement extends LitElement {
    render(){
        console.log(s2.canvasGroupsName);
        console.log(window.electron.test);
        return html`<p>Hello World</p>`
    } 
    
}