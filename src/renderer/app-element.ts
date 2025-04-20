import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { CourseDTO, RepoDTO } from "../core";
import { when } from "lit/directives/when.js";
import { CourseLoadedEvent } from "./courses-list";
import { RepoSelectedEvent } from "./repositories-list";
import { ReposLoadedEvent } from "./course-details";

@customElement("app-element")
export class AppElement extends LitElement {
    @property({ type: Object })
    activeCourse: CourseDTO;

    @property({ type: Array })
    availableRepos: RepoDTO[];

    @property({ type: Object })
    activeRepo: RepoDTO;


    courseLoaded(e: CourseLoadedEvent) {
        this.activeCourse = e.course;
    }

    reposLoaded(e: ReposLoadedEvent) {
        this.availableRepos = e.repos;
    }

    repoSelected(e: RepoSelectedEvent){
        this.activeRepo = e.repo;
    }

    render() {
        return html`
            <h1>Tooling</h1>
            <h2>Cursussen</h2>            
            <courses-list @course-loaded=${this.courseLoaded}></courses-list>
            ${when(this.activeCourse, () => html`                
                <h2>Cursus</h2>    
                <course-details .course=${this.activeCourse} @repos-loaded=${this.reposLoaded}></course-details>
                ${when(this.availableRepos, () => html`                
                <h3>Repositories</h3>
                <repositories-list .repos=${this.availableRepos} @repo-selected=${this.repoSelected}></repositories-list>
                    ${when(this.activeRepo, () => html`
                        <repository-details .repo=${this.activeRepo}></repository-details>
                    `)}                
                `)}                
            `)}
        `
    }
}