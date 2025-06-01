import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { CourseDTO, RepoDTO, Startup } from "../core";
import { when } from "lit/directives/when.js";
import { CourseLoadedEvent } from "./courses-list";
import { RepoSelectedEvent } from "./repositories-list";
import { ReposLoadedEvent } from "./course-details";
import { ElectronIPC } from "./ipc";
import { ipcContext } from "./contexts";
import { provide } from "@lit/context";
import { ErrorHandlingIPC } from "./errorHandlingIPC";
import { start } from "repl";

@customElement("app-element")
export class AppElement extends LitElement {

    @provide({ context: ipcContext})
    ipc: ElectronIPC;
    
    constructor() {
        super();
        this.ipc = new ErrorHandlingIPC(window.electron);
    }

    @property({ type: Object })
    activeCourse: CourseDTO;

    @property({ type: Array })
    availableRepos: RepoDTO[];

    @property({ type: Object })
    activeRepo: RepoDTO;

    @property({ type: Boolean, state: true })
    showSettings: boolean = false;

    @property({ type: Boolean, state: true })
    isActive: boolean = false;

    @property({ type: String, state: true })
    githubUser: string = '';
    @property({ type: String, state: true })
    canvasUser: string = '';

    reload(startup: Startup){
        if(startup.validSettings){
            this.isActive = true;
            this.showSettings = false;
            this.githubUser = startup.githubUser;
            this.canvasUser = startup.canvasUser;
        }else{
            this.isActive = false;
            this.showSettings = true;
            this.githubUser = '';
            this.canvasUser = '';
        }
    }

    protected firstUpdated(_changedProperties: PropertyValues): void {
        this.ipc.startup().then(startup => {
            this.reload(startup);
        });
    }

    courseLoaded(e: CourseLoadedEvent) {
        this.activeCourse = e.course;
    }

    reposLoaded(e: ReposLoadedEvent) {
        this.availableRepos = e.repos;
    }

    repoSelected(e: RepoSelectedEvent) {
        this.activeRepo = e.repo;
    }

    static styles = css`
        h1 {
            margin-bottom: 0.1em;
            text-align: center;
        }

        :host {
            display: grid;
            grid-template-areas:
                "header header"
                "nav details";            
            grid-template-columns: minmax(min-content, 1fr) 3fr;
        }

        header {
            width: 100%;
        }

        ul {
            list-style: none;
            padding: 0;
            display: flex;
            flex-direction: row;            
            justify-content: space-around;
            align-items: center;
        }

        li {
            padding-bottom: 0.5em;
            margin-bottom: 0.1em;
            border-bottom: 1px solid transparent;
        }

        li:hover {
            border-bottom: 1px solid black;
        }

        nav.top {
            display:block;
            width: 100%;
        }

        .user {
            float:right;
        }
        `;

    async goToSettings() {
        this.showSettings = true;
    }
    async goToDashboard() {
        this.showSettings = false;
    }

    async onSettingsChanged(e) {  
        let startup = await this.ipc.startup();        
        console.log("new startup", startup);
        this.reload(startup);
    }

    render() {
        return html`
        <header style="grid-area: header;">
            <h1>HU S3 Tooling</h1>
            <nav class="top" label="app navigation">
                <ul>
                     ${when(this.isActive, () => html`  
                    <li><a href="#" @click=${this.goToDashboard}>Dashboard</a></li>
                    <li><a>Students</a></li>
                    <li><a>Repositories</a></li>
                        `, () => html`
                    <li><a>Dashboard</a></li>
                    <li><a>Students</a></li>
                    <li><a>Repositories</a></li>
                        `)}                    
                    <li><a href="#" @click=${this.goToSettings}>Settings</a></li>
                    <li>
                    <div class="user">
                    <p>${this.githubUser}</p>
                    <p>${this.canvasUser}</p>
                </div>
                    </li>
                </ul>
                
            </nav>
        </header>
        <nav style="grid-area: nav;" label="dashboard navigation">
            ${when(this.isActive, () => html`  
                <h2>Cursussen</h2>            
                <courses-list @course-loaded=${this.courseLoaded}></courses-list>
                ${when(this.activeCourse, () => html`  
                    <course-details .course=${this.activeCourse} @repos-loaded=${this.reposLoaded}></course-details>
                `)}
                ${when(this.availableRepos, () => html`                
                    <h3>Repositories</h3>
                    <repositories-list .repos=${this.availableRepos} @repo-selected=${this.repoSelected}></repositories-list>
                `)}
            `)}
        </nav>
        <main style="grid-area: details;">            
        ${when(this.showSettings, 
            () => html`
                <settings-page @settings-changed=${this.onSettingsChanged}></settings-page>`, 
            () => html`            
                ${when(this.activeRepo, () => html`
                    <repository-details .repo=${this.activeRepo}></repository-details>
                `)}
        `)}
        </main>
        `
    }
}