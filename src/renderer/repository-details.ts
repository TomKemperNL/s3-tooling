import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AuthorStatisticsDTO, BlameStatisticsDTO, LinesStatistics, RepoDTO, RepoStatisticsDTO, RepoStatisticsPerWeekDTO } from "../shared";
import { when } from "lit/directives/when.js";
import { map } from "lit/directives/map.js";
import { BackendApi } from "../backend-api";
import { classMap } from "lit/directives/class-map.js";
import { ipcContext } from "./contexts";
import { consume } from "@lit/context";
import { HTMLInputEvent } from "./events";
import { a } from "vitest/dist/chunks/suite.d.FvehnV49.js";
import { AuthorMappedEvent, EnabledAuthorsChanged } from "./author-list";

export class AuthorSelectedEvent extends Event {
    static eventName = 'author-selected';
    constructor(public authorName: string) {
        super(AuthorSelectedEvent.eventName, {
            bubbles: true,
            composed: true
        });
    }
}

@customElement('repository-details')
export class RepositoryDetails extends LitElement {
    @consume({context: ipcContext})
    ipc: BackendApi;
    
    constructor() {
        super();
        this.repoStats = undefined;
    }

    @property({ type: Object })
    repo: RepoDTO;

    @property({ type: String, state: true })
    currentBranch: string = '';
    @property({ type: Array, state: true })
    branches: string[] = [];
    @property({ type: Object, state: true })
    repoStats?: RepoStatisticsDTO;
    @property({ type: Object, state: true })
    blameStats?: BlameStatisticsDTO;
    @property({ type: Boolean, state: true })
    loading: boolean = false;
    @property({ type: String, state: true })
    selectedAuthorName: string = '';
    @property({ type: Object, state: true })
    selectedAuthor: AuthorStatisticsDTO;

    @property({ type: Array, state: true })
    allAuthors: string[] = [];

    @property({ type: Array, state: true })
    enabledAuthors: string[] = [];


    
    protected updated(_changedProperties: PropertyValues): void {
        if (_changedProperties.has('repo')) {
            this.loading = true;

            this.currentBranch = '';
            this.branches = [];
            this.repoStats = undefined;
            this.blameStats = undefined;
            this.selectedAuthorName = '';
            this.selectedAuthor = undefined;
            this.allAuthors = [];
            this.enabledAuthors = [];


            let gettingBranchInfo = this.ipc.getBranchInfo(this.repo.courseId, this.repo.assignment, this.repo.name);
            let gettingRepos = this.ipc.getRepoStats(this.repo.courseId, this.repo.assignment, this.repo.name, { filterString: '' });
            let gettingBlameStats = this.ipc.getBlameStats(this.repo.courseId, this.repo.assignment, this.repo.name, { filterString: '' });
            Promise.all([gettingBranchInfo, gettingRepos, gettingBlameStats]).then(([branchInfo, repoStats, blamestats]) => {

                this.currentBranch = branchInfo.currentBranch;
                this.branches = branchInfo.availableBranches;
                this.repoStats = repoStats;
                this.blameStats = blamestats;
                this.loading = false;
            });
        }
        if (_changedProperties.has('repoStats')) {
            console.log('setting authors');
            if(this.repoStats){
                this.allAuthors = Object.keys(this.repoStats.authors);
                this.enabledAuthors = Object.keys(this.repoStats.authors);
            }            
        }
    }

    toggleAuthors(e: EnabledAuthorsChanged){
        this.enabledAuthors = e.enabledAuthors;
    }
        
    selectAuthor(e: AuthorSelectedEvent) {
        this.selectedAuthorName = e.authorName;
        this.ipc.getStudentStats(
            this.repo.courseId,
            this.repo.assignment,
            this.repo.name,
            { authorName: e.authorName }).then(
                authorStats => {
                    this.selectedAuthor = authorStats;
                });

    };

    async mapAuthors(e: AuthorMappedEvent) {
        await this.ipc.updateAuthorMapping(this.repo.courseId, this.repo.name, e.mapping);
        await this.refresh(null);
    }
    

    colors = [//Heb CoPilot maar de kleuren laten kiezen...
        "rgba(223,159,159,1)",
        "rgba(223,191,159,1)",
        "rgba(223,223,159,1)",
        "rgba(191,223,159,1)",
        "rgba(159,223,159,1)",
        "rgba(159,223,191,1)",
        "rgba(159,223,223,1)",
        "rgba(159,191,223,1)",
        "rgba(159,159,223,1)",
        "rgba(191,159,223,1)",
        "rgba(223,159,223,1)",
        "rgba(223,159,191,1)"
    ]

    authorToColor(author: string): string {
        let authors = this.allAuthors;
        if (authors.indexOf(author) === -1) {
            return 'rgba(0,0,0,1)';
        } else {
            return this.colors[authors.indexOf(author) % this.colors.length];
        }
    }

    toDatasets(statsByWeek: RepoStatisticsPerWeekDTO): any[] {
        let datasets: any[] = [];

        for (let a of this.enabledAuthors) {            
            let addedNumbers = statsByWeek.authors[a].map(w => w.added);
            let removedNumbers = statsByWeek.authors[a].map(w => w.removed * -1);
            let options = {
                label: a,
                backgroundColor: this.authorToColor(a),
                borderColor: this.authorToColor(a),
                borderWidth: 1
            }

            datasets.push({
                data: addedNumbers,
                ...options
            });

            datasets.push({
                data: removedNumbers,
                ...options
            });
        }

        return datasets;
    }

    async refresh(e: Event){
        console.log('Refreshing repository', this.repo);
        this.loading = true;
        await this.ipc.refreshRepo(this.repo.courseId, this.repo.assignment, this.repo.name);
        this.repo = {...this.repo};
        this.loading = false;
    }

    async switchBranch(e: HTMLInputEvent){
        let selected = e.target.value;
        if (selected && selected !== this.currentBranch) {
            this.currentBranch = selected;            
            await this.ipc.switchBranch(this.repo.courseId, this.repo.assignment, this.repo.name, selected);
            await this.refresh(null);
        }
    }

    static styles = css`
    :host {
        display: grid;
        grid-template-areas:
            "title title"
            "pie     bar"
            "numbers student";
            ;
        grid-template-columns: 1fr 2fr;
        grid-template-rows: min-content minmax(25%, 50%) 1fr;
    }

    .loading {
        opacity: 0.5;
    }
    ul {
        list-style: none;
    }
    `

    render() {
        let labels: string[] = [];
        let datasets: any[] = [];

        let blameLabels: string[] = [];
        let blameValues: number[] = [];
        let blameColors: string[] = [];

        if (this.repoStats) {

            for (let i = 0; i < this.repoStats.weekly.total.length; i++) {
                labels.push('Week ' + (i + 1));
            }
            datasets = this.toDatasets(this.repoStats.weekly!);
        }

        if (this.blameStats) {
            for (let a of Object.keys(this.blameStats?.blamePie)) {
                if (this.enabledAuthors.indexOf(a) === -1) {
                    continue;
                }
                blameLabels.push(a);
                blameValues.push(this.blameStats.blamePie[a]);
                blameColors.push(this.authorToColor(a));
            }
        }

        let authorList = this.allAuthors.map(a => ({
            name: a,
            member: this.repo.members.indexOf(a) !== -1,
            color: this.authorToColor(a),
            enabled: this.enabledAuthors.indexOf(a) !== -1
        }));

        return html`
        <div style="grid-area: title">
            <h3>${this.repo.name}</h3>
            <p><select ?disabled=${this.loading} @change=${this.switchBranch}>
                ${map(this.branches, b => html`
                    <option value=${b} ?selected=${b === this.currentBranch}>${b}</option>
                `)}
            </select><button type="button" ?disabled=${this.loading} @click=${this.refresh}>Refresh</button></p>
        </div>        
        
        <div style="grid-area: numbers;" class=${classMap({ loading: this.loading })}>
            <ul>
                ${when(this.repoStats, () => html`
                    <li>Added: ${this.repoStats!.total.added} / Removed: ${this.repoStats!.total.removed}</li>
                    <li>Authors:
                        <author-list .authors=${authorList} @author-selected=${this.selectAuthor} @enabled-authors-changed=${this.toggleAuthors} @author-mapped=${this.mapAuthors}></author-list>
                    </li>
                    `)}                
            </ul>
            
        </div>
        <div style="grid-area: bar">
        ${when(this.repoStats, () => html`
            <stacked-bar-chart 
                class=${classMap({ loading: this.loading })} 
                
                .labels=${labels} 
                .datasets=${datasets}></stacked-bar-chart>
        `)}
        </div>
        <div style="grid-area: pie">
        ${when(this.repoStats, () => html`
            <pie-chart 
                class=${classMap({ loading: this.loading })} 
                
                .labels=${blameLabels}
                .values=${blameValues}
                .colors=${blameColors}></pie-chart>
        `)}
        </div>
        <div style="grid-area: student">
        ${when(this.selectedAuthor, () => html`
                <student-details  .authorName=${this.selectedAuthorName} .authorStats=${this.selectedAuthor}></student-details>
            `)}    
        </div>
        `;
    }
}