import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { CourseDTO, RepoDTO } from "../core";
import { when } from "lit/directives/when.js";
import { CourseLoadedEvent } from "./courses-list";
import { RepoSelectedEvent } from "./repositories-list";
import { ReposLoadedEvent } from "./course-details";
import { ElectronIPC } from "./ipc";
import { AuthorSelectedEvent, StudentSelectedEvent } from "./repository-details";

@customElement("app-element")
export class AppElement extends LitElement {
    ipc: ElectronIPC;
    constructor() {
        super();
        this.ipc = window.electron;
    }

    @property({ type: Object })
    activeCourse: CourseDTO;

    @property({ type: Array })
    availableRepos: RepoDTO[];

    @property({ type: Object })
    activeRepo: RepoDTO;

    @property({ type: Boolean, state: true })
    showSettings: boolean = false;

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
        :host {
            display: grid;
            grid-template-areas:
                "header header"
                "nav details";
            grid-template-columns: minmax(min-content, 1fr) 3fr;
        }

        header {
            align-self: center;
            justify-self: center;
        }

        ul {
            list-style: none;
            padding: 0;
            display: flex;
            flex-direction: row;
            float: right;
            justify-content: space-around
        }
        `;

    async goToSettings() {
        this.showSettings = true;
    }
    async goToDashboard() {
        this.showSettings = false;
    }

    render() {
        return html`
        <header style="grid-area: header;">
            <h1>HU S3 Tooling</h1>
            <nav label="app navigation">
                <ul>
                    <li><a href="#" @click=${this.goToDashboard}>Dashboard</a></li>
                    <li><a>Students</a></li>
                    <li><a>Repositories</a></li>
                    <li><a href="#" @click=${this.goToSettings}>Settings</a></li>
                </ul>
            </nav>
        </header>
        <nav style="grid-area: nav;" label="dashboard navigation">            
            <h2>Cursussen</h2>            
            <courses-list @course-loaded=${this.courseLoaded}></courses-list>
            ${when(this.activeCourse, () => html`  
                <course-details .course=${this.activeCourse} @repos-loaded=${this.reposLoaded}></course-details>
            `)}
            ${when(this.availableRepos, () => html`                
                <h3>Repositories</h3>
                <repositories-list .repos=${this.availableRepos} @repo-selected=${this.repoSelected}></repositories-list>
            `)}
        </nav>
        <main style="grid-area: details;">            
        ${when(this.showSettings, () => html`
            <settings-page></settings-page>`, () => html`            
                ${when(this.activeRepo, () => html`
                    <repository-details .repo=${this.activeRepo}></repository-details>
                `)}
        `)}
        </main>
        `
    }
}