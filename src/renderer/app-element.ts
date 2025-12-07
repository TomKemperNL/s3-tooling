import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AuthorStatisticsDTO, CourseDTO, RepoDTO, Startup, StudentDTO } from "../shared";
import { when } from "lit/directives/when.js";
import { CourseLoadedEvent } from "./dashboard/courses-list";
import { RepoSelectedEvent } from "./dashboard/repositories-list";
import { ReposLoadedEvent, SectionSelectedEvent } from "./dashboard/course-details";
import { BackendApi } from "../backend-api";
import { ipcContext } from "./contexts";
import { provide } from "@lit/context";
import { ErrorHandlingBackendApi } from "./error-handling-backend";
import { AuthorSelectedEvent } from "./dashboard/author-list";
import { choose } from "lit/directives/choose.js";
import { Page } from "./navigation/pages";
import { NavigationRequestedEvent } from "./navigation/events";
import { StudentSelectedEvent } from "./students/students-page";


@customElement("app-element")
export class AppElement extends LitElement {

    @provide({ context: ipcContext })
    ipc: BackendApi;

    constructor() {
        super();
        this.ipc = new ErrorHandlingBackendApi(window.electron);
    }

    @property({ type: Object })
    activeCourse: CourseDTO;

    @property({ type: Array })
    availableRepos: RepoDTO[];

    @property({ type: Object })
    activeRepo: RepoDTO;

    @property({ type: Object })
    activeStudent: StudentDTO;

    @property({ type: String, state: true })
    activePage: Page = "repo";

    @property({type: Number, state: true})
    courseId: number = null;
    @property({type: String, state: true})
    selectedSection: string = null;
    @property({type: String, state: true})
    selectedAssignment: string = null;

    @property({ type: Boolean, state: true })
    isActive: boolean = false;

    @property({ type: String, state: true })
    githubUser: string = '';
    @property({ type: String, state: true })
    canvasUser: string = '';

    @property({ type: String, state: true })
    selectedAuthor: string;

    reload(startup: Startup) {
        if (startup.validSettings) {
            this.isActive = true;
            this.activePage = "repo";
            this.githubUser = startup.githubUser;
            this.canvasUser = startup.canvasUser;
        } else {
            this.isActive = false;
            this.activePage = "repo";
            this.githubUser = '';
            this.canvasUser = '';
        }
    }

    protected firstUpdated(_changedProperties: PropertyValues): void {
        this.ipc.startup().then(startup => {
            this.reload(startup);
            this.load();
        });
    }

    courseLoaded(e: CourseLoadedEvent) {
        this.activeCourse = e.course;
        this.availableRepos = null;
        this.activeRepo = null;
        this.selectedAuthor = null;
    }

    courseCleared(e: Event) {
        this.activeCourse = null;
        this.availableRepos = null;
        this.activeRepo = null;
        this.selectedAuthor = null;
    }

    reposLoaded(e: ReposLoadedEvent) {
        this.availableRepos = e.repos;
        this.activeRepo = null;
        this.selectedAuthor = null;
    }

    repoSelected(e: RepoSelectedEvent) {
        this.activeRepo = e.repo;
        this.activePage = "repo";
        this.selectedAuthor = null;
        this.save();
    }

    studentSelected(e: StudentSelectedEvent){
        this.activeStudent = e.student;
        this.activePage = "student-progress";
        this.save();
    }

    repoCleared(e: Event) {
        this.activeRepo = null;
        this.selectedAuthor = null;
    }

    reposCleared(e: Event) {
        this.availableRepos = null;
        this.activeRepo = null;
        this.selectedAuthor = null;
    }

    selectAuthor(e: AuthorSelectedEvent) {
        this.selectedAuthor = e.authorName;
        this.save();
    }

    sectionSelected(e: SectionSelectedEvent) {
        this.selectedSection = e.section;
        this.save();
    }

    detailsSelected(e: { assignment: string, section: string }) {
        this.selectedAssignment = e.assignment;
        this.selectedSection = e.section;
        this.save();
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
            align-items: stretch;
        }

        li {
            cursor: pointer;
            text-align: center;
            flex-grow: 1;
            padding-bottom: 0.5em;
            margin-bottom: 0.1em;
            border-bottom: 1px solid transparent;
        }
        li.user {
            cursor: default;
            text-align: left;
            min-width: 200px;
            flex-grow: 0;            
        }
        .user p {
            margin: 0;
        }
        li:hover {
            background-color: #f0f0f0;
            border-bottom: 1px solid black;
        }
        li.user:hover {
            background-color: inherit;
            border-bottom: 1px solid transparent;
        }

        nav.top {
            display:block;
            width: 100%;
        }        
        `;

    goTo(page: Page) {
        return () => {
            this.activePage = page;
            this.save();
        }
    }

    async handleNavigation(e: NavigationRequestedEvent) {
        this.activePage = e.page;
        this.save();
    }


    async onSettingsChanged(e: Event) {
        const startup = await this.ipc.startup();
        this.reload(startup);
    }

    save() {
        const memento = {
            activeRepo: this.activeRepo,
            activeCourse: this.activeCourse,
            availableRepos: this.availableRepos,
            selectedAuthor: this.selectedAuthor,
            selectedSection: this.selectedSection,
            selectedAssignment: this.selectedAssignment,
            activePage: this.activePage,
            activeStudent: this.activeStudent
        }

        window.localStorage.setItem('app-element-memento', JSON.stringify(memento));
    }

    load() {
        try {
            const memento = window.localStorage.getItem('app-element-memento');
            if (memento) {
                const parsed = JSON.parse(memento);
                this.activeRepo = parsed.activeRepo;
                this.activeCourse = parsed.activeCourse;
                this.availableRepos = parsed.availableRepos;
                this.selectedAuthor = parsed.selectedAuthor;
                this.selectedSection = parsed.selectedSection;
                this.selectedAssignment = parsed.selectedAssignment;
                this.activePage = parsed.activePage
                this.activeStudent = parsed.activeStudent;
            }
        } catch (e) {
            console.error("Error loading memento", e);
        }
    }

    render() {
        return html`
        <header style="grid-area: header;">
            <h1>HU S3 Tooling</h1>
            <nav class="top" label="app navigation">
                <ul>
                     ${when(this.isActive, () => html`  
                    <li @click=${this.goTo("repo")}><a href="#">Dashboard</a></li>
                    <li @click=${this.goTo("students")}><a href="#">Students</a></li>
                    <li><a>Repositories</a></li>
                        `, () => html`
                    <li><a>Dashboard</a></li>
                    <li><a>Students</a></li>
                    <li><a>Repositories</a></li>
                        `)}                    
                    <li @click=${this.goTo("settings")}><a href="#">Settings</a></li>
                    <li class="user">                    
                        <p>Github: ${this.githubUser}</p>
                        <p>Canvas: ${this.canvasUser}</p>                    
                    </li>
                </ul>
                
            </nav>
        </header>
        <nav style="grid-area: nav;" label="dashboard navigation" @navigation-requested=${this.handleNavigation}>
            ${when(this.isActive, () => html`  
                <h2>Cursussen</h2>            
                <courses-list @course-loaded=${this.courseLoaded} @course-cleared=${this.courseCleared}></courses-list>
                ${when(this.activeCourse, () => html`  
                    <custom-carat></custom-carat>
                    <course-details .course=${this.activeCourse} 
                        @section-selected=${this.sectionSelected}
                        @details-selected=${this.detailsSelected} 
                        @repos-loaded=${this.reposLoaded} 
                        @repos-cleared=${this.reposCleared}></course-details>
                `)}
                ${when(this.availableRepos, () => html`                
                    <h3>Repositories</h3>
                    <custom-carat></custom-carat>
                    <repositories-list .repos=${this.availableRepos} @repo-selected=${this.repoSelected} @repo-cleared=${this.repoCleared}></repositories-list>
                `)}
            `)}
        </nav>
        <main style="grid-area: details;">            
        ${choose(this.activePage, [[
            "settings", () => html`
                <settings-page @settings-changed=${this.onSettingsChanged}></settings-page>
            `], 
            ["students", () => html`
                 ${when(!!this.activeCourse, () => html`
                <students-page .course=${this.activeCourse} .section=${this.selectedSection} @student-selected=${this.studentSelected}></students-page>
                `)}
            `],
            ["student-progress", () => html`
                 ${when(!!this.activeStudent, () => html`
                <student-progress  courseId=${this.activeCourse.canvasId}></student-progress>
                `)}
            `],
            ["section", () => html`
                ${when(!!this.activeCourse && !!this.selectedAssignment && !!this.selectedSection, () => html`
                    <section-details courseId=${this.activeCourse.canvasId} section=${this.selectedSection} assignment=${this.selectedAssignment}></section-details>
                `)}
            `],
            ["repo", () => html`
                ${when(!!this.activeRepo, () => html`
                    <repository-details .repo=${this.activeRepo} @author-selected=${this.selectAuthor}></repository-details>`
                )}
            `]])}
        </main>
        `
    }
}