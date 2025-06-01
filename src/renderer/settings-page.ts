import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ElectronIPC } from "./ipc";
import { Settings } from "../settings";
import { ipcContext } from "./contexts";
import { consume } from "@lit/context";
import { Startup } from "../core";

export class SettingsChanged extends Event {
    static readonly eventName = "settings-changed";
    constructor() {
        super(SettingsChanged.eventName, {
            bubbles: true,
            composed: true
        });
    }
}

@customElement("settings-page")
export class SettingsPage extends LitElement {
    @consume({ context: ipcContext })
    ipc: ElectronIPC;

    constructor() {
        super();
        this.settings = <any>{};
    }

    @property({ type: Object, state: true })
    settings: Settings;

    @property({ type: Boolean, state: true })
    loading: boolean = false;

    async loadSettings() {
        this.loading = true;
        let settings = await this.ipc.loadSettings();
        this.settings = settings;
        this.loading = false;
    }

    firstUpdated(): void {
        this.loadSettings();
    }

    async saveSettings() {
        this.loading = true;
        console.log("Saving settings:", this.settings);
        await this.ipc.saveSettings(this.settings);
        this.dispatchEvent(new SettingsChanged());
        this.loading = false;
    }

    render() {
        return html`
            <div>
                Settings</div>
                <form>
                    <ul>                        
                    <li>
                        <label for="canvasToken">Canvas Token:</label>
                        <input
                            required
                            type="password"
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
                            required
                            type="password"
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
                            required
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
                        <label for="ignoredAuthors">Ignored Authors (comma separated):</label>
                        <textarea
                            id="ignoredAuthors"
                            name="ignoredAuthors"
                            .value=${this.settings.ignoreAuthors ? this.settings.ignoreAuthors.join(", ") : ""}
                            @input=${(e: Event) => {
                this.settings.ignoreAuthors = (e.target as HTMLInputElement).value.split(",").map(s => s.trim());
            }}
                        ></textarea>
                    </li>
                    </ul>
                    <div>
                        <button type="button" @click=${this.saveSettings} ?disabled=${this.loading}>
                            Save Settings
                        </button>
                        <button type="button" @click=${this.loadSettings} ?disabled=${this.loading}>
                            Undo (reload settings)
                        </button>
                    </div>
                </form>
                
                `;
    }
}