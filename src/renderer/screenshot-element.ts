import { provide } from "@lit/context";
import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ipcContext } from "./contexts";
import { BackendApi, ScreenshotApi, ScreenshotArgs } from "../backend-api";
import { RepoDTO } from "../shared";

@customElement('screenshot-element')
export class ScreenShotElement extends LitElement {


    @provide({ context: ipcContext })
    ipc: BackendApi & ScreenshotApi;

    @property({ type: String })
    user: string;
    @property({ type: Number })
    courseId: number;


    constructor() {
        super();
        this.ipc = window.electron;
    }

    connectedCallback(): void {
        super.connectedCallback();
        this.ipc.onLoadUserStats((data: ScreenshotArgs) => {
            console.log("onLoadUserStats callback", data);
            this.courseId = data.courseId;
            this.user = data.user;
        });
    }

    async takeScreenshot() {
        setTimeout(async () => {
            await this.ipc.requestScreenshot(`${this.user}-screenshot`);
            window.close();
        }, 1000); //Hmm, hij heeft toch nog een wait nodig, om niet midden in een render te screenshotten of zoiets?

    }

    render() {
        if (this.user && this.courseId) {
            console.log("Rendering student-progress for", this.user, this.courseId);
            return html`
            <student-progress @author-details-rendered=${this.takeScreenshot} readonly user=${this.user} courseId=${this.courseId} ></student-progress>            
            `;
        } else {
            return html`<p>Loading...</p>`;
        }


    }
}