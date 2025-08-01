import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AuthorStatisticsDTO, PieDTO, LinesStatistics, RepoDTO, RepoStatisticsDTO, RepoStatisticsPerWeekDTO, GroupPieDTO, RepoStatisticsDTO2 } from "../../shared";
import { when } from "lit/directives/when.js";
import { map } from "lit/directives/map.js";
import { BackendApi } from "../../backend-api";
import { classMap } from "lit/directives/class-map.js";
import { ipcContext } from "../contexts";
import { consume } from "@lit/context";
import { HTMLInputEvent } from "../events";
import { a } from "vitest/dist/chunks/suite.d.FvehnV49.js";
import { AuthorMappedEvent, EnabledAuthorsChanged, RemoveAliasEvent } from "./author-list";

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
    repoStats2: RepoStatisticsDTO2;

    @property({ type: Object, state: true })
    blameStats?: PieDTO;

    @property({ type: Object, state: true })
    groupPie?: GroupPieDTO;


    @property({ type: Boolean, state: true })
    loading: boolean = false;

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
            this.groupPie = undefined;
            this.allAuthors = [];
            this.enabledAuthors = [];


            let gettingBranchInfo = this.ipc.getBranchInfo(this.repo.courseId, this.repo.assignment, this.repo.name);
            let gettingRepos = this.ipc.getRepoStats(this.repo.courseId, this.repo.assignment, this.repo.name, { filterString: '' });
            let gettingRepos2 = this.ipc.getRepoStats2(this.repo.courseId, this.repo.assignment, this.repo.name, { filterString: '' });
            let gettingBlameStats = this.ipc.getBlameStats(this.repo.courseId, this.repo.assignment, this.repo.name, { filterString: '' });
            let gettingGroupPie = this.ipc.getGroupPie(this.repo.courseId, this.repo.assignment, this.repo.name, { filterString: '' });

            Promise.all([gettingBranchInfo, gettingRepos, gettingBlameStats, gettingGroupPie, gettingRepos2]).then(([branchInfo, repoStats, blamestats, groupPie, repoStats2]) => {

                this.currentBranch = branchInfo.currentBranch;
                this.branches = branchInfo.availableBranches;
                this.repoStats = repoStats;
                this.blameStats = blamestats;
                this.groupPie = groupPie;
                this.loading = false;
                this.repoStats2 = repoStats2;
            });
        }
        if (_changedProperties.has('repoStats')) {            
            if(this.repoStats){
                this.allAuthors = Object.keys(this.repoStats.authors);
                this.enabledAuthors = Object.keys(this.repoStats.authors);
            }            
        }
    }

    toggleAuthors(e: EnabledAuthorsChanged){
        this.enabledAuthors = e.enabledAuthors;
    }
        
    async mapAuthors(e: AuthorMappedEvent) {
        await this.ipc.updateAuthorMapping(this.repo.courseId, this.repo.name, e.mapping);
        await this.refresh(null);
    }

    async removeAlias(e: RemoveAliasEvent){
        let aliases : Record<string, string[]> = {};
        aliases[e.author] = [e.alias];

        await this.ipc.removeAlias(this.repo.courseId, this.repo.name, aliases);
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

    //TODO: Copy-pasta van author-details fixen
    groupColors = [        
        "rgba(255, 99, 132, 0.8)",
        "rgba(54, 162, 235, 0.8)",
        "rgba(255, 206, 86, 0.8)",
        "rgba(75, 192, 192, 0.8)",
        "rgba(153, 102, 255, 0.8)",
    ]

    authorToColor(author: string): string {
        let authors = this.allAuthors;
        if (authors.indexOf(author) === -1) {
            return 'rgba(0,0,0,1)';
        } else {
            return this.colors[authors.indexOf(author) % this.colors.length];
        }
    }

    groupToColor(group: string): string {
        let groups = Object.keys(this.groupPie?.groupedPie || []);
        if (groups.indexOf(group) === -1) {
            return 'rgba(0,0,0,1)';
        } else {
            return this.groupColors[groups.indexOf(group) % this.groupColors.length];
        }
    }

    toDatasets(statsByWeek: RepoStatisticsPerWeekDTO): any[] {
        console.log('toDatasets', statsByWeek);
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

    toDatasets2(statsByWeek: Record<string, Record<string,LinesStatistics>>[]): any[] {
        console.log('toDatasets2', statsByWeek);
        let dataPerAuthor: Record<string, LinesStatistics>[] = [];
        for(let week of statsByWeek){
            let dataSet : Record<string, LinesStatistics> = {};
            for (let group of Object.keys(week)){
                let groupStats = week[group];
                for(let author of Object.keys(groupStats)){
                    if(this.enabledAuthors.indexOf(author) === -1) {
                        continue;
                    }
                    dataSet[author] = groupStats[author] || { added: 0, removed: 0 };
                    dataSet[author].added += groupStats[author].added;
                    dataSet[author].removed -= groupStats[author].removed;
                }
            }
            dataPerAuthor.push(dataSet);
        }

        let datasets: any[] = [];
        for(let author of this.enabledAuthors) {
            let addedNumbers = dataPerAuthor.map(w => w[author]?.added || 0);
            let removedNumbers = dataPerAuthor.map(w => w[author]?.removed || 0);
            let options = {
                label: author,
                backgroundColor: this.authorToColor(author),
                borderColor: this.authorToColor(author),
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
            "title    title"
            "pie      bar"
            "numbers  bar2";
            ;
        grid-template-columns: 1fr 3fr;
        /* grid-template-rows: min-content minmax(25%, 50%) 1fr; */
    }

    /* :host > div {
        border: 1px dashed slategray
    } */

    .loading {
        opacity: 0.5;
    }
    ul {
        list-style: none;
    }
    `

    render() {
        let labels: string[] = [];
        let labels2: string[] = [];
        let datasets: any[] = [];
        let datasets2: any[] = [];

        let blameLabels: string[] = [];
        let blameValues: number[] = [];
        let blameColors: string[] = [];

        let groupLabels: string[] = [];
        let groupValues: number[] = [];
        let groupColors: string[] = [];


        if (this.repoStats) {

            for (let i = 0; i < this.repoStats.weekly.total.length; i++) {
                labels.push('Week ' + (i + 1));
            }
            datasets = this.toDatasets(this.repoStats.weekly!);
        }

        if (this.repoStats2) {

            for (let i = 0; i < this.repoStats.weekly.total.length; i++) {
                labels2.push('Week ' + (i + 1));
            }
            datasets2 = this.toDatasets2(this.repoStats2.week_group_author);
        }

        if (this.blameStats) {
            for (let a of Object.keys(this.blameStats?.pie)) {
                if (this.enabledAuthors.indexOf(a) === -1) {
                    continue;
                }
                blameLabels.push(a);
                blameValues.push(this.blameStats.pie[a]);
                blameColors.push(this.authorToColor(a));
            }
        }

        if(this.groupPie){
            for (let g of Object.keys(this.groupPie?.groupedPie)) {
                groupLabels.push(g);

                let authorTotals = 0;
                for( let a of Object.keys(this.groupPie.groupedPie[g])) {
                    if( this.enabledAuthors.indexOf(a) !== -1) {
                        authorTotals += this.groupPie.groupedPie[g][a];
                    }
                }
                groupValues.push(authorTotals);
                groupColors.push(this.groupToColor(g));
            }
        }

        let authorList = this.allAuthors.map(a => ({
            name: a,
            member: this.repo.members.indexOf(a) !== -1,
            color: this.authorToColor(a),
            enabled: this.enabledAuthors.indexOf(a) !== -1,
            aliases: this.repoStats?.aliases[a] || [],
            added: this.repoStats?.authors[a]?.added || 0,
            removed: this.repoStats?.authors[a]?.removed || 0
        }));

        return html`
        <div style="grid-area: title">
            <h3><a href=${this.repo.url.replace("https", "external")}>${this.repo.name}</a></h3>
            <p><select ?disabled=${this.loading} @change=${this.switchBranch}>
                ${map(this.branches, b => html`
                    <option value=${b} ?selected=${b === this.currentBranch}>${b}</option>
                `)}
            </select><button type="button" ?disabled=${this.loading} @click=${this.refresh}>Refresh</button></p>
        </div>        
        
        <div style="grid-area: pie">
        ${when(this.repoStats, () => html`
            <pie-chart 
                class=${classMap({ loading: this.loading, chart: true })} 
                
                .labels=${blameLabels}
                .values=${blameValues}
                .colors=${blameColors}></pie-chart>
        `)}
        ${when(this.groupPie, () => html`
            <pie-chart 
                class=${classMap({ loading: this.loading, chart: true })} 
                
                .labels=${groupLabels}
                .values=${groupValues}
                .colors=${groupColors}></pie-chart>
        `)}
        </div>

        <div style="grid-area: numbers;" class=${classMap({ loading: this.loading })}>
            <ul>
                ${when(this.repoStats, () => html`
                    <li>Added: ${this.repoStats!.total.added} / Removed: ${this.repoStats!.total.removed}</li>
                    <li>Authors:
                        <author-list 
                            .authors=${authorList}
                            @enabled-authors-changed=${this.toggleAuthors} 
                            @author-mapped=${this.mapAuthors}
                            @remove-alias=${this.removeAlias}></author-list>
                    </li>
                    `)}                
            </ul>
            
        </div>
        <div style="grid-area: bar">
        ${when(this.repoStats, () => html`
            <stacked-bar-chart 
                class=${classMap({ loading: this.loading, chart: true  })} 
                
                .labels=${labels} 
                .datasets=${datasets}></stacked-bar-chart>
        `)}
        </div>    
        <div style="grid-area: bar2">
        ${when(this.repoStats, () => html`
            <stacked-bar-chart 
                class=${classMap({ loading: this.loading, chart: true  })} 
                
                .labels=${labels2} 
                .datasets=${datasets2}></stacked-bar-chart>
        `)}
        </div>   
        `;
    }
}