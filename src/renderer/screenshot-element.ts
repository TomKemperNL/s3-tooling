import { provide } from "@lit/context";
import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ipcContext } from "./contexts";
import { BackendApi, ScreenshotApi, ScreenshotArgs } from "../backend-api";
import { RepoDTO } from "../shared";

@customElement('screenshot-element')
export class ScreenShotElement extends LitElement {

    
    @provide({ context: ipcContext})    
    ipc: BackendApi & ScreenshotApi;

    @property({ type: Object })
    repo: RepoDTO;
    

    constructor(){
        super();
        this.ipc = window.electron;
    }

    @property({ type: String })
    author: string;

    connectedCallback(): void {
        super.connectedCallback();
        this.ipc.onLoadUserStats((data: ScreenshotArgs) => {            
            this.ipc.loadRepo(data.courseId, data.assignment, data.repository).then(repo => {
                this.author = data.user;
                this.repo = repo;
            });            
        });

    }

    async takeScreenshot(){
        setTimeout(async () => {
            await this.ipc.requestScreenshot(`${this.author}-screenshot`);
            window.close();    
        }, 0); //Hmm, hij heeft toch nog een wait nodig, om niet midden in een render te screenshotten of zoiets?
        
    }

    render() {
        if(this.repo){
            return html`
            <author-details @author-details-rendered=${this.takeScreenshot} readonly .repo=${this.repo} .author=${this.author} ></author-details>            
            `;    
        }else{
            return html`            
            Loading...
            `;
        }
    }
}