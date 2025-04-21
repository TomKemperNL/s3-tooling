import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { RepoDTO, RepoStatisticsDTO } from "../core";
import { when } from "lit/directives/when.js";
import { map } from "lit/directives/map.js";
import { ElectronIPC } from "./ipc";

@customElement('repository-details')
export class RepositoryDetails extends LitElement {
    ipc: ElectronIPC;
    constructor() {
        super();
        this.ipc = window.electron;
    }


    @property({ type: Object })
    repo: RepoDTO;

    @property({ type: Object, state: true })
    repoStats: RepoStatisticsDTO;

    protected updated(_changedProperties: PropertyValues): void {
        if (_changedProperties.has('repo')) {
            this.ipc.getRepoStats(this.repo.courseId, this.repo.assignment, this.repo.name, { filterString: '' }).then(
                stats => {
                    this.repoStats = stats;
                }
            );
        }
    }

    render() {
        let labels: string[] = [];
        let values: number[] = [];
        if (this.repoStats) {
            for (let i = 0; i < this.repoStats.weekly.total.length; i++) {
                labels.push('Week ' + (i + 1));
            }
            values = this.repoStats.weekly?.total.map(w => w.added - w.removed);
        }
        console.log('stats', labels, values);
        return html`
            <p>${this.repo.name}</p>
            <ul>
                <li>Filter (regex): <input type="text" value=".*" disabled></li>
                ${when(this.repoStats, () => html`
                    <li>Added: ${this.repoStats.total.added} / Removed: ${this.repoStats.total.removed}</li>
                    <li>Authors:
                        <ul>
                            ${map(Object.keys(this.repoStats.authors), a => html`
                                <li><button disabled type="button">Select</button>${a}, Added: ${this.repoStats.authors[a].added} / Removed: ${this.repoStats.authors[a].removed}</li>
                            `)}
                        </ul>

                    </li>
                    `)}
                
            </ul>
            ${when(this.repoStats, () => html`
                <bar-chart .data=${{ labels: labels, values: values }}></bar-chart>
            `)}
        `;
    }
}