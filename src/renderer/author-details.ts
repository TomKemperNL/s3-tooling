import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AuthorStatisticsDTO } from "../shared";
import { classMap } from "lit/directives/class-map.js";

@customElement('student-details')
export class StudentDetails extends LitElement {
    @property({ type: Object })
    authorStats: AuthorStatisticsDTO = {
        total: {},
        weekly: []
    }

    @property({ type: Boolean })
    loading: boolean = false;

    @property({type: String})
    authorName: string = "";

    private colors = [
        "rgba(255, 99, 132, 0.8)",
        "rgba(54, 162, 235, 0.8)",
        "rgba(255, 206, 86, 0.8)",
        "rgba(75, 192, 192, 0.8)",
        "rgba(153, 102, 255, 0.8)",
    ]

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
        console.log('authorStats', this.authorStats);

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