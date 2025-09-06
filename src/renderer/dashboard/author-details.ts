import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { LinesStatistics, RepoDTO, RepoStatisticsDTO, GroupPieDTO } from "../../shared";
import { when } from "lit/directives/when.js";
import { BackendApi } from "../../backend-api";
import { classMap } from "lit/directives/class-map.js";
import { ipcContext } from "../contexts";
import { consume } from "@lit/context";


@customElement('author-details')
export class RepositoryDetails extends LitElement {
    @consume({context: ipcContext})
    ipc: BackendApi;
    
    constructor() {
        super();
        this.repoStats = undefined;
    }

    @property({ type: Object })
    repo: RepoDTO;

    @property({ type: String })
    author: String;

    @property({ type: Boolean})
    readonly: boolean = false;
    
    @property({ type: Object, state: true })
    repoStats: RepoStatisticsDTO;

    @property({ type: Object, state: true })
    groupPie?: GroupPieDTO;

    @property({ type: Boolean, state: true })
    loading: boolean = false;


    @property({ type: Array, state: true })
    allGroups: string[] = [];


    
    protected updated(_changedProperties: PropertyValues): void {
        if (_changedProperties.has('repo')) {
            this.loading = true;

            this.repoStats = undefined;
            this.groupPie = undefined;


            let gettingRepos = this.ipc.getRepoStats(this.repo.courseId, this.repo.assignment, this.repo.name);
            let gettingGroupPie = this.ipc.getGroupPie(this.repo.courseId, this.repo.assignment, this.repo.name);

            Promise.all([gettingRepos, gettingGroupPie]).then(([repoStats, groupPie]) => {
                this.repoStats = repoStats;                
                this.groupPie = groupPie;
                this.loading = false;                
            });
        }
        if (_changedProperties.has('repoStats')) {            
            if(this.repoStats){
                this.allGroups = this.repoStats.groups;
            }            
        }
    }

    //TODO: Copy-pasta van author-details fixen
    groupColors = [        
        "rgba(255, 99, 132, 0.8)",
        "rgba(54, 162, 235, 0.8)",
        "rgba(255, 206, 86, 0.8)",
        "rgba(75, 192, 192, 0.8)",
        "rgba(153, 102, 255, 0.8)",
        "rgba(88, 88, 88, 0.8)",
    ]

    groupToColor(group: string): string {
        let groups = Object.keys(this.groupPie?.groupedPie || []);
        if (groups.indexOf(group) === -1) {
            return 'rgba(0,0,0,1)';
        } else {
            return this.groupColors[groups.indexOf(group) % this.groupColors.length];
        }
    }


    toGroupBarchart(statsByWeek: Record<string, Record<string,LinesStatistics>>[]): any[] {
        let dataPerWeek: Record<string, LinesStatistics>[] = [];
        for(let week of statsByWeek){
            let weekData : Record<string, LinesStatistics> = {};
            for (let group of Object.keys(week)) {
                let groupData = { added: 0, removed: 0 };
                for(let author of Object.keys(week[group])) {                    
                    groupData.added += week[group][author].added;
                    groupData.removed -= week[group][author].removed;
                }
                weekData[group] = groupData;
            }
            dataPerWeek.push(weekData);
        }
        let datasets: any[] = [];
        for(let group of this.allGroups) {
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
        let groupBarcharts: any[] = [];

        let groupLabels: string[] = [];
        let groupValues: number[] = [];
        let groupColors: string[] = [];


        if (this.repoStats) {
            for (let i = 0; i < this.repoStats.week_group_author.length; i++) {
                labels.push('Week ' + (i + 1));
            }
            groupBarcharts = this.toGroupBarchart(this.repoStats.week_group_author);
        }

        if(this.groupPie){
            for (let g of Object.keys(this.groupPie?.groupedPie)) {
                if( this.allGroups.indexOf(g) === -1) {
                    continue;
                }
                groupLabels.push(g);

                let authorTotals = 0;
                for( let a of Object.keys(this.groupPie.groupedPie[g])) {
                    authorTotals += this.groupPie.groupedPie[g][a];                    
                }
                groupValues.push(authorTotals);
                groupColors.push(this.groupToColor(g));
            }
        }

        let groupList = this.allGroups.map(g => ({
            name: g,
            enabled: true,
            color: this.groupToColor(g),
        }));

        return html`
        <div style="grid-area: title">
            <h3><a href=${this.repo.url.replace("https", "external")}>${this.repo.name}</a></h3>         
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

        <div style="grid-area: groups;" class=${classMap({ loading: this.loading })}>
            <ul>
                ${when(this.allGroups.length > 0, () => html`                    
                    <h4>Groeperingen</h4>
                        <group-list 
                            .groups=${groupList}                            
                            ></group-list>                
                    `)}                
            </ul>
            
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