import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AuthorStatisticsDTO, RepoDTO } from "../../shared";
import { classMap } from "lit/directives/class-map.js";
import { consume } from "@lit/context";
import { ipcContext } from "../contexts";
import { BackendApi } from "../../backend-api";

@customElement('author-details')
export class AuthorDetails extends LitElement {

    @consume({context: ipcContext})
    ipc: BackendApi;

    @property({ type: Object, state: true })
    authorStats: AuthorStatisticsDTO = {
        total: {},
        weekly: []
    }

    @property({ type: Boolean })
    loading: boolean = false;

    @property({type: String})
    authorName: string = "";

    @property({ type: Object })
    repo: RepoDTO;

    private colors = [        
        "rgba(255, 99, 132, 0.8)",
        "rgba(54, 162, 235, 0.8)",
        "rgba(255, 206, 86, 0.8)",
        "rgba(75, 192, 192, 0.8)",
        "rgba(153, 102, 255, 0.8)",
        "rgba(88, 88, 88, 0.8)",
    ]

    protected updated(_changedProperties: PropertyValues): void {
        if(_changedProperties.has('repo') || _changedProperties.has('authorName')) {
            this.loading = true;

            this.ipc.getStudentStats(
                this.repo.courseId,
                this.repo.assignment,
                this.repo.name,
                { authorName: this.authorName }).then(
                    authorStats => {
                        this.authorStats = authorStats;
                        this.loading = false;
                    });
        }
    }

    toDatasets(): any[] {
        let datasets: any[] = [];

        let groups = Object.keys(this.authorStats.total);

        for (let group of groups) {            
            let addedPerWeek = this.authorStats.weekly.map(w => w[group].added);
            let removedPerWeek = this.authorStats.weekly.map(w => w[group].removed * -1);

            let color = this.colors[groups.indexOf(group) % this.colors.length];

            let options = {
                label: group,
                backgroundColor: color,
                borderColor: color,
                borderWidth: 1
            }

            datasets.push({
                data: addedPerWeek,
                ...options
            });

            datasets.push({
                data: removedPerWeek,
                ...options
            });
        }

        return datasets;
    }

    render() {
        let labels: string[] = [];
        let datasets: any[] = [];

        if (this.authorStats) {
            for (let i = 0; i < this.authorStats.weekly.length; i++) {
                labels.push('Week ' + (i + 1));
            }
            datasets = this.toDatasets();
        }

        return html`
            <h3>Author Details: ${this.authorName}</h3>
            <stacked-bar-chart 
                            class=${classMap({ loading: this.loading })} 
                            style="grid-area: bar" 
                            .labels=${labels} 
                            .datasets=${datasets}></stacked-bar-chart>
            
        `;
    }
}