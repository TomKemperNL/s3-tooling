import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { test, expect } from "vitest";

function delay(ms: number) : Promise<void>{
    return new Promise(resolve => setTimeout(resolve, ms));
}

@customElement("dummy-element")
export class DummyElement extends LitElement {

    @property({ type: Boolean, state: true })
    dataLoaded = false;

    @property({ type: Number, state: true })
    counter = 0;

    @property({ type: String, state: true })
    incrementTxt = "1";

    loadCompleted: Promise<void>;

    constructor() {
        super();
    }

    async connectedCallback() {
        super.connectedCallback();
        
        this.loadCompleted = delay(100);
        this.dataLoaded = true;
    }

    protected render(){
        return html`<div>Dummy Element
        <input type="number" .value=${this.incrementTxt} @input=${(e: any) => this.incrementTxt = e.target.value}>
        <button @click=${() => this.counter = this.counter + parseInt(this.incrementTxt)}>++</button></div>`;
    }
}

test('Can use JSDom and test stuff', async () => {
        const dummy = new DummyElement();
        document.body.appendChild(dummy);
        
        await dummy.updateComplete;
        await dummy.loadCompleted
        expect(dummy.dataLoaded).toBe(true);
})


test('Can increment counter', async () => {
        const dummy = new DummyElement();
        document.body.appendChild(dummy);
        
        await dummy.updateComplete;
        await dummy.loadCompleted

        dummy.shadowRoot?.querySelector("button")?.click();
        expect(dummy.counter).toBe(1);
})
    