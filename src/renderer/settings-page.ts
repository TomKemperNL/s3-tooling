import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { BackendApi } from "../backend-api";
import { Settings } from "../shared";
import { ipcContext } from "./contexts";
import { consume } from "@lit/context";
import { Startup } from "../shared";

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
    ipc: BackendApi;

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
        const settings = await this.ipc.loadSettings();
        this.settings = settings;
        this.loading = false;
    }

    firstUpdated(): void {
        this.loadSettings();
    }

    async saveSettings() {
        this.loading = true;
        await this.ipc.saveSettings(this.settings);
        this.dispatchEvent(new SettingsChanged());
        this.loading = false;
    }

    openDirBrowser() {
        this.ipc.openDirectory(this.settings.dataPath).then((path: string) => {
            if (path) {
                this.settings.dataPath = path;
                this.requestUpdate();
            }
        });
    }

    static styles = css`
            .hastooltip {
                position: relative;
                display: inline-block;
                cursor: pointer;
            }

            .tooltip {
                visibility: hidden;
                width: 120px;
                background-color: #fff;
                border: 1px solid #555;
                text-align: center;
                border-radius: 6px;
                padding: 5px 0;
                position: absolute;
                z-index: 1;
            }

            .hastooltip:hover .tooltip {
                visibility: visible;
            }
        `;


    render() {
        return html`
            <div>
                Settings</div>
                <form>
                    <ul>                        
                    <li>
                        <label for="canvasToken">
                            <a href="external://canvas.hu.nl/profile/settings#access_tokens_holder">Canvas</a> Token:
                        </label>
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
                        <label for="githubToken">
                            <a class="hastooltip" href="external://github.com/settings/tokens">GitHub
                                <div class="tooltip">Benodigde Permissions:
                                    <ul>
                                        <li>Repo (full, helaas)</li>
                                        <li>admin:org-read:org</li>
                                        <li>user-read:user</li>
                                        <li>read:discussion</li>
                                        <li>read:project</li>
                                        <li>read:ssh_signing_key</li>                                        
                                    </ul>
                                    En denk aan de SSO toegang!
                                </div>
                            </a> Classic(!) Token:</label>
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
                        <button type="button" @click=${this.openDirBrowser}>Browse</button>
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