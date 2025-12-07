import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CourseDTO, GroupPieDTO, LinesStatistics, RepoStatisticsDTO, StudentDetailsDTO, StudentDTO, StudentStatisticsDTO } from '../../shared';
import { consume } from '@lit/context';
import { ipcContext } from '../contexts';
import { BackendApi } from '../../backend-api';
import { when } from 'lit/directives/when.js';
import { classMap } from 'lit/directives/class-map.js';


@customElement('student-progress')
export class StudentProgress extends LitElement {
    @consume({ context: ipcContext })
    api: BackendApi

    @property({ type: Object })
    student: StudentDetailsDTO;

    @property({ type: Object })
    course: CourseDTO;

    connectedCallback(): void {
        super.connectedCallback();

        let firstIdentity = Object.keys(this.student.identities)[0];
        this.api.getStudentStats(this.course.canvasId, firstIdentity).then(stats => {
            this.apiResult = stats;
            console.log(this.apiResult);
            this.allGroups = stats.groups;
            this.enabledGroups = stats.groups;
        });
    }

    constructor(){
        super();
        this.apiResult = null;
    }


    @property({ type: Boolean })
    readonly: boolean = true;

    @property({ type: Object, state: true })
    apiResult: StudentStatisticsDTO & GroupPieDTO

    @property({ type: Boolean, state: true })
    loading: boolean = false;

    @property({ type: Array, state: true })
    allGroups: string[] = [];

    @property({ type: Array, state: true })
    enabledGroups: string[] = [];


    //COPY PASTA HELL

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

    groupToColor(group: string): string {
        const groups = Object.keys(this.apiResult?.groupedPie || []);
        if (groups.indexOf(group) === -1) {
            return 'rgba(0,0,0,1)';
        } else {
            return this.groupColors[groups.indexOf(group) % this.groupColors.length];
        }
    }

    toGroupBarchart(statsByWeek: Record<string, LinesStatistics>[]): any[] {
        const dataPerWeek: Record<string, LinesStatistics>[] = [];
        for (const week of statsByWeek) {
            const weekData: Record<string, LinesStatistics> = {};
            for (const group of Object.keys(week)) {
                const groupData = { added: 0, removed: 0 };                
                groupData.added += week[group].added;
                groupData.removed -= week[group].removed;            
                weekData[group] = groupData;
            }
            dataPerWeek.push(weekData);
        }
        const datasets: any[] = [];
        for (const group of this.enabledGroups) {
            const addedNumbers = dataPerWeek.map(w => w[group]?.added || 0);
            const removedNumbers = dataPerWeek.map(w => w[group]?.removed || 0);
            const options = {
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

    #barsDone: boolean = false;
    #pieDone: boolean = false;

    barsRendered() {
        this.#barsDone = true;
        if (this.#pieDone) {
            this.dispatchEvent(new CustomEvent('author-details-rendered'));
        }

    }
    pieRendered() {
        this.#pieDone = true;
        if (this.#barsDone) {
            this.dispatchEvent(new CustomEvent('author-details-rendered'));
        }
    }

    //...................














    render() {
        let firstIdentity = Object.keys(this.student.identities)[0];
        const labels: string[] = [];
        let groupBarcharts: any[] = [];

        const groupLabels: string[] = [];
        const groupValues: number[] = [];
        const groupColors: string[] = [];


        if (this.apiResult) {
            for (let i = 0; i < this.apiResult.week_group.length; i++) {
                labels.push('Week ' + (i + 1));
            }
            groupBarcharts = this.toGroupBarchart(this.apiResult.week_group);


            for (const g of Object.keys(this.apiResult.groupedPie)) {
                if (this.enabledGroups.indexOf(g) === -1) {
                    continue;
                }
                groupLabels.push(g);

                const authorTotals = this.apiResult.groupedPie[g][firstIdentity] || 0;
                groupValues.push(authorTotals);
                groupColors.push(this.groupToColor(g));
            }
        }

        const groupList = this.allGroups.map(g => ({
            name: g,
            enabled: this.enabledGroups.indexOf(g) !== -1,
            color: this.groupToColor(g),
        }));

        return html`           
            <div style="grid-area: pieG">        
            ${when(this.apiResult, () => html`
                <h4>Regels code in eindproduct per groepering</h4>
                <pie-chart 
                    class=${classMap({ loading: this.loading, chart: true })} 
                    
                    .labels=${groupLabels}
                    .values=${groupValues}
                    .colors=${groupColors}
                    @chart-rendered=${this.pieRendered}></pie-chart>
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
            ${when(this.apiResult, () => html`
                <h4>Changes per week per groepering</h4>
                <stacked-bar-chart 
                    class=${classMap({ loading: this.loading, chart: true })} 
                    
                    .labels=${labels} 
                    .datasets=${groupBarcharts}
                    @chart-rendered=${this.barsRendered}></stacked-bar-chart>           
            `)}
            </div>
            `;
    }
}