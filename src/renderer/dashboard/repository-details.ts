import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AuthorStatisticsDTO, PieDTO, LinesStatistics, RepoDTO, RepoStatisticsDTO, RepoStatisticsPerWeekDTO, GroupPieDTO } from "../../shared";
import { when } from "lit/directives/when.js";
import { map } from "lit/directives/map.js";
import { BackendApi } from "../../backend-api";
import { classMap } from "lit/directives/class-map.js";
import { ipcContext } from "../contexts";
import { consume } from "@lit/context";
import { HTMLInputEvent } from "../events";
import { a } from "vitest/dist/chunks/suite.d.FvehnV49.js";
import { AuthorMappedEvent, EnabledAuthorsChanged, RemoveAliasEvent } from "./author-list";
import { EnabledItemsChanged } from "./group-list";

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

    @property({ type: Boolean})
    readonly: boolean = false;

    @property({ type: String, state: true })
    currentBranch: string = '';
    @property({ type: Array, state: true })
    branches: string[] = [];
    
    @property({ type: Object, state: true })
    repoStats: RepoStatisticsDTO;

    @property({ type: Object, state: true })
    groupPie?: GroupPieDTO;

    @property({ type: Boolean, state: true })
    loading: boolean = false;

    @property({ type: Array, state: true })
    allAuthors: string[] = [];

    @property({ type: Array, state: true })
    enabledAuthors: string[] = [];

    @property({ type: Array, state: true })
    allGroups: string[] = [];

    @property({ type: Array, state: true })
    enabledGroups: string[] = [];

    
    protected updated(_changedProperties: PropertyValues): void {
        if (_changedProperties.has('repo')) {
            this.loading = true;

            this.currentBranch = '';
            this.branches = [];
            this.repoStats = undefined;
            this.groupPie = undefined;
            this.allAuthors = [];
            this.enabledAuthors = [];


            let gettingBranchInfo = this.ipc.getBranchInfo(this.repo.courseId, this.repo.assignment, this.repo.name);
            let gettingRepos = this.ipc.getRepoStats(this.repo.courseId, this.repo.assignment, this.repo.name, { filterString: '' });
            let gettingGroupPie = this.ipc.getGroupPie(this.repo.courseId, this.repo.assignment, this.repo.name, { filterString: '' });

            Promise.all([gettingBranchInfo, gettingRepos, gettingGroupPie]).then(([branchInfo, repoStats, groupPie]) => {

                this.currentBranch = branchInfo.currentBranch;
                this.branches = branchInfo.availableBranches;
                this.repoStats = repoStats;                
                this.groupPie = groupPie;
                this.loading = false;
                
            });
        }
        if (_changedProperties.has('repoStats')) {            
            if(this.repoStats){
                this.allAuthors = this.repoStats.authors;
                this.enabledAuthors = this.repoStats.authors;
                this.allGroups = this.repoStats.groups;
                this.enabledGroups = this.repoStats.groups;
            }            
        }
    }

    toggleAuthors(e: EnabledAuthorsChanged){
        this.enabledAuthors = e.enabledAuthors;
    }
        
    
    toggleGroups(e: EnabledItemsChanged){
        this.enabledGroups = e.enabledGroups;
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
        "rgba(88, 88, 88, 0.8)",
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

    toAuthorPie(pie: Record<string, Record<string, number>>) : Record<string, number>{
        let result: Record<string, number> = {};
        for(let group of Object.keys(pie)){
            if( this.enabledGroups.indexOf(group) === -1) {
                continue;
            }
            for(let author of Object.keys(pie[group])){
                result[author] = (result[author] || 0) + pie[group][author];
            }
        }
        return result;
    }

    toGroupBarchart(statsByWeek: Record<string, Record<string,LinesStatistics>>[]): any[] {
        let dataPerWeek: Record<string, LinesStatistics>[] = [];
        for(let week of statsByWeek){
            let weekData : Record<string, LinesStatistics> = {};
            for (let group of Object.keys(week)) {
                let groupData = { added: 0, removed: 0 };
                for(let author of Object.keys(week[group])) {
                    if( this.enabledAuthors.indexOf(author) === -1) {
                        continue;
                    }
                    groupData.added += week[group][author].added;
                    groupData.removed -= week[group][author].removed;
                }
                weekData[group] = groupData;
            }
            dataPerWeek.push(weekData);
        }
        let datasets: any[] = [];
        for(let group of this.enabledGroups) {
            let addedNumbers = dataPerWeek.map(w => w[group]?.added || 0);
            let removedNumbers = dataPerWeek.map(w => w[group]?.removed || 0);
            let options = {
                label: group,
                backgroundColor: this.groupToColor(group),
                borderColor: this.groupToColor(group),
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

    toAuthorBarchart(statsByWeek: Record<string, Record<string,LinesStatistics>>[]): any[] {        
        let dataPerWeek: Record<string, LinesStatistics>[] = [];
        for(let week of statsByWeek){
            let weekData : Record<string, LinesStatistics> = {};
            for (let group of Object.keys(week)){
                if( this.enabledGroups.indexOf(group) === -1) {
                    continue;
                }
                let groupStats = week[group];
                for(let author of Object.keys(groupStats)){                   
                    weekData[author] = weekData[author] || { added: 0, removed: 0 };
                    weekData[author].added += groupStats[author].added;
                    weekData[author].removed -= groupStats[author].removed;
                }
            }
            dataPerWeek.push(weekData);
        }
        
        let datasets: any[] = [];
        for(let author of this.enabledAuthors) {
            let addedNumbers = dataPerWeek.map(w => w[author]?.added || 0);
            let removedNumbers = dataPerWeek.map(w => w[author]?.removed || 0);
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
            "title   title     title"
            "authors pieA      barA"
            "groups  pieG      barG"            
            ;
        grid-template-columns: 1fr 1fr 3fr;
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
        let authorBarcharts: any[] = [];
        let groupBarcharts: any[] = [];

        let blameLabels: string[] = [];
        let blameValues: number[] = [];
        let blameColors: string[] = [];

        let groupLabels: string[] = [];
        let groupValues: number[] = [];
        let groupColors: string[] = [];


        if (this.repoStats) {

            for (let i = 0; i < this.repoStats.week_group_author.length; i++) {
                labels.push('Week ' + (i + 1));
            }
            authorBarcharts = this.toAuthorBarchart(this.repoStats.week_group_author);
            groupBarcharts = this.toGroupBarchart(this.repoStats.week_group_author);
        }

        if(this.groupPie){
            let authorPie = this.toAuthorPie(this.groupPie.groupedPie);
            for (let a of Object.keys(authorPie)) {
                if (this.enabledAuthors.indexOf(a) === -1) {
                    continue;
                }
                blameLabels.push(a);
                blameValues.push(authorPie[a]);
                blameColors.push(this.authorToColor(a));
            }

            for (let g of Object.keys(this.groupPie?.groupedPie)) {
                if( this.enabledGroups.indexOf(g) === -1) {
                    continue;
                }
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
            // added: this.repoStats?.authors[a]?.added || 0,
            // removed: this.repoStats?.authors[a]?.removed || 0
        }));

        let groupList = this.allGroups.map(g => ({
            name: g,
            enabled: this.enabledGroups.indexOf(g) !== -1,
            color: this.groupToColor(g),
        }));

        return html`
        <div style="grid-area: title">
            <h3><a href=${this.repo.url.replace("https", "external")}>${this.repo.name}</a></h3>
            ${when(!this.readonly, () => html`
                <select ?disabled=${this.loading} @change=${this.switchBranch}>
                    ${map(this.branches, b => html`
                        <option value=${b} ?selected=${b === this.currentBranch}>${b}</option>
                    `)}
                </select><button type="button" ?disabled=${this.loading} @click=${this.refresh}>Refresh</button>
            `)}
        </div>        
        
        <div style="grid-area: pieA">
        ${when(this.repoStats, () => html`
            <h4>Regels code in eindproduct per auteur</h4>
            <pie-chart 
                class=${classMap({ loading: this.loading, chart: true })} 
                
                .labels=${blameLabels}
                .values=${blameValues}
                .colors=${blameColors}></pie-chart>
                
        `)}        
        </div>
        <div style="grid-area: pieG">        
        ${when(this.groupPie, () => html`
            <h4>Regels code in eindproduct per groepering</h4>
            <pie-chart 
                class=${classMap({ loading: this.loading, chart: true })} 
                
                .labels=${groupLabels}
                .values=${groupValues}
                .colors=${groupColors}></pie-chart>
        `)}
        </div>

        <div style="grid-area: authors;" class=${classMap({ loading: this.loading })}>
            <ul>
                ${when(this.allAuthors.length > 0, () => html`                    
                    <h4>Auteurs</h4>
                        <author-list readonly
                            .authors=${authorList}
                            @enabled-authors-changed=${this.toggleAuthors} 
                            @author-mapped=${this.mapAuthors}
                            @remove-alias=${this.removeAlias}></author-list>                    
                    `)}                
            </ul>
            
        </div>

        <div style="grid-area: groups;" class=${classMap({ loading: this.loading })}>
            <ul>
                ${when(this.allGroups.length > 0, () => html`                    
                    <h4>Groeperingen</h4>
                        <group-list 
                            .groups=${groupList}
                            @enabled-items-changed=${this.toggleGroups}                             
                            ></group-list>                
                    `)}                
            </ul>
            
        </div>

        <div style="grid-area: barA">
        ${when(this.repoStats, () => html`
            <h4>Changes per week per auteur</h4>
            <stacked-bar-chart 
                class=${classMap({ loading: this.loading, chart: true  })} 
                
                .labels=${labels} 
                .datasets=${authorBarcharts}></stacked-bar-chart>
                
        `)}
        </div>
        <div style="grid-area: barG">
        ${when(this.repoStats, () => html`
            <h4>Changes per week per groepering</h4>
            <stacked-bar-chart 
                class=${classMap({ loading: this.loading, chart: true  })} 
                
                .labels=${labels} 
                .datasets=${groupBarcharts}></stacked-bar-chart>           
        `)}
        </div>
        `;
    }
}