import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ElectronIPC } from "./ipc";
import { Settings } from "../settings";

@customElement("settings-page")
export class SettingsPage extends LitElement {
    ipc: ElectronIPC;
    settings: Settings;

    constructor() {
        super();
        this.settings = <any>{};
        this.ipc = window.electron;
    }

    @property({ type: Object })
    settings: Settings;

    @property({ type: Boolean, state: true })
    loading: boolean = false;

    render() {
        return html`
            <div>
                Settings</div>
                `;
    }
}