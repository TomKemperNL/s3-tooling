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
    constructor(){
        super();
        this.ipc = window.electron;
    }

    @property({ type: Object })
    activeCourse: CourseDTO;

    @property({ type: Array })
    availableRepos: RepoDTO[];

    @property({ type: Object })
    activeRepo: RepoDTO;

    @property({ type: Object })
    activeAuthor: any;

    courseLoaded(e: CourseLoadedEvent) {
        this.activeCourse = e.course;
    }

    reposLoaded(e: ReposLoadedEvent) {
        this.availableRepos = e.repos;
    }

    repoSelected(e: RepoSelectedEvent) {
        this.activeRepo = e.repo;
    }

    authorSelected(e: AuthorSelectedEvent) {        
        this.ipc.getStudentStats(
            this.activeRepo.courseId, 
            this.activeRepo.assignment, 
            this.activeRepo.name, 
            { authorName: e.authorName}).then(
            authorStats => {  
                console.log('received author stats', authorStats);
                this.activeAuthor = authorStats;
            });
    }


    static styles = css`
           :host {
            display: grid;
            grid-template-areas:
                "nav details"
        }
        `;


    render() {
        return html`
        <div style="grid-area: nav;">
            <h1>Tooling</h1>
            <h2>Cursussen</h2>            
            <courses-list @course-loaded=${this.courseLoaded}></courses-list>
            ${when(this.activeCourse, () => html`                
                <h2>Cursus</h2>    
                <course-details .course=${this.activeCourse} @repos-loaded=${this.reposLoaded}></course-details>
            `)}
            ${when(this.availableRepos, () => html`                
                <h3>Repositories</h3>
                <repositories-list .repos=${this.availableRepos} @repo-selected=${this.repoSelected}></repositories-list>
                                    
            `)}
        </div>
        <div style="grid-area: details;">
            ${when(this.activeRepo, () => html`
                <repository-details @author-selected=${this.authorSelected} .repo=${this.activeRepo}></repository-details>
            `)}

            ${when(this.activeAuthor, () => html`
                <student-details .authorStats=${this.activeAuthor}></student-details>
            `)}
            
        </div>
        `
    }
}