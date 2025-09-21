import { consume } from "@lit/context";
import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ipcContext } from "../contexts";
import { BackendApi } from "../../backend-api";
import { LinesStatistics, SectionStatisticsDTO } from "../../shared";
import { classMap } from "lit/directives/class-map.js";
import { when } from "lit/directives/when.js";
import { EnabledItemsChanged } from "./group-list";

@customElement('section-details')
export class SectionDetails extends LitElement {

    @consume({ context: ipcContext })
    ipc: BackendApi;

    @property({ type: Number })
    courseId: number;
    @property({ type: String })
    section: string;
    @property({ type: String })
    assignment: string;

    protected updated(_changedProperties: PropertyValues): void {
        if (_changedProperties.has('courseId') || _changedProperties.has('section') || _changedProperties.has('assignment')) {
            this.ipc.getSectionStats(this.courseId, this.assignment, this.section).then(stats => {
                console.log("Fetched section stats:", stats);
                this.sectionDTO = stats;
                this.enabledGroups = stats?.groups || [];
            });
        }
    }

    @property({ type: Boolean, state: true })
    loading: boolean = false;

    @property({ type: Object, state: true })
    sectionDTO: SectionStatisticsDTO;


    @property({ type: Array, state: true })
    enabledGroups: string[] = [];


    groupColors = [
        "rgba(255, 99, 132, 0.8)",
        "rgba(54, 162, 235, 0.8)",
        "rgba(255, 206, 86, 0.8)",
        "rgba(75, 192, 192, 0.8)",
        "rgba(153, 102, 255, 0.8)",
        "rgba(88, 88, 88, 0.8)",
    ]

    groupToColor(group: string): string {
        const groups = this.sectionDTO?.groups || [];
        if (groups.indexOf(group) === -1) {
            return 'rgba(0,0,0,1)';
        } else {
            return this.groupColors[groups.indexOf(group) % this.groupColors.length];
        }
    }
    
    toggleGroups(e: EnabledItemsChanged){
        this.enabledGroups = e.enabledGroups;
    }

    protected render() {
        let labels: string[] = [];
        let datasets: any[] = [];
        let groupList : {
            name: string;
            enabled: boolean;
            color: string;
        }[] = [];

        if (this.sectionDTO) {
            labels = this.sectionDTO.authors;
            let perGroupCounts: Record<string, Record<string, LinesStatistics>> = {};

            for (let author of this.sectionDTO.authors) {
                for (let group of this.sectionDTO.groups) {
                    if (!perGroupCounts[group]) {
                        perGroupCounts[group] = {};
                    }

                    perGroupCounts[group][author] = this.sectionDTO.author_group[author]?.[group] || { added: 0, removed: 0 };
                }
            }

            for (let group of this.sectionDTO.groups) {
                if (this.enabledGroups.indexOf(group) === -1) {
                    continue;
                }
                const options = {
                    label: group,
                    backgroundColor: this.groupToColor(group),
                    borderColor: this.groupToColor(group),
                    borderWidth: 1
                }

                let addedData = this.sectionDTO.authors.map(author => perGroupCounts[group][author]?.added || 0);
                let removedData = this.sectionDTO.authors.map(author => perGroupCounts[group][author]?.removed * -1 || 0);


                datasets.push({
                    data: addedData,
                    ...options
                });

                datasets.push({
                    data: removedData,
                    ...options
                });
            }

            
            groupList = this.sectionDTO.groups.map(g => ({
                name: g,
                enabled: this.enabledGroups.indexOf(g) !== -1,
                color: this.groupToColor(g),
            }));
        }




        return html`
            <div>
                <h3>Details for Section: ${this.section}, Assignment: ${this.assignment}</h3>
                <p>Course ID: ${this.courseId}</p>
                <!-- Additional details can be added here -->


                <div style="grid-area: groups;" class=${classMap({ loading: this.loading })}>
            
                ${when(this.sectionDTO, () => html`                    
                    <h4>Groeperingen</h4>
                        <group-list 
                            .groups=${groupList}
                            @enabled-items-changed=${this.toggleGroups}                             
                            ></group-list>                
                    `)}                
            
            
        </div>
        <div style="grid-area: groups;" class=${classMap({ loading: this.loading })}>
            
                <stacked-bar-chart 
                    .labels=${labels} 
                    .datasets=${datasets}></stacked-bar-chart>
            </div></div>
        `;
    }
}