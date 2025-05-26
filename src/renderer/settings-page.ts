import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ElectronIPC } from "./ipc";
import { Settings } from "../settings";

@customElement("settings-page")
export class SettingsPage extends LitElement {
    ipc: ElectronIPC;

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
                <form>
                    <ul>
                        
                    <li>
                        <label for="canvasToken">Canvas Token:</label>
                        <input
                            type="text"
                            id="canvasToken"
                            name="canvasToken"
                            .value=${this.settings.canvasToken || ""}
                            @input=${(e: Event) => {
                this.settings.canvasToken = (e.target as HTMLInputElement).value;
            }}
                        />
                    </li>
                    <li>
                        <label for="githubToken">GitHub Token:</label>
                        <input
                            type="text"
                            id="githubToken"
                            name="githubToken"
                            .value=${this.settings.githubToken || ""}
                            @input=${(e: Event) => {
                this.settings.githubToken = (e.target as HTMLInputElement).value;
            }}
                        />
                    </li>
                    <li>
                        <label for="dataPath">Data Path:</label>
                        <input
                            type="text"
                            id="dataPath"
                            name="dataPath"
                            .value=${this.settings.dataPath || ""}
                            @input=${(e: Event) => {
                this.settings.dataPath = (e.target as HTMLInputElement).value;
            }}
                        />
                    </li>
                    <li>
                        <label for="keepDB">Keep Database:</label>
                        <input
                            type="checkbox"
                            id="keepDB"
                            name="keepDB"
                            ?checked=${this.settings.keepDB || false}
                            @change=${(e: Event) => {
                this.settings.keepDB = (e.target as HTMLInputElement).checked;
            }}
                        />
                    </li>
                    <li>
                        <label for="ignoredAuthors">Ignored Authors (comma separated):</label>
                        <input
                            type="text"
                            id="ignoredAuthors"
                            name="ignoredAuthors"
                            .value=${this.settings.ignoredAuthors ? this.settings.ignoredAuthors.join(", ") : ""}
                            @input=${(e: Event) => {
                this.settings.ignoredAuthors = (e.target as HTMLInputElement).value.split(",").map(s => s.trim());
            }}
                        />
                    </li>
                    </ul>
                </form>
                `;
    }
}