import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { RepoDTO, RepoStatisticsDTO } from "../core";
import { when } from "lit/directives/when.js";
import { map } from "lit/directives/map.js";
import { ElectronIPC } from "./ipc";

@customElement('repository-details')
export class RepositoryDetails extends LitElement{
    ipc: ElectronIPC;
    constructor(){
        super();
        this.ipc = window.electron;
    }


    @property({type: Object})
    repo: RepoDTO;

    @property({type: Object, state:true})
    repoStats: RepoStatisticsDTO;

    async refresh(){        
        this.repoStats = await this.ipc.getRepoStats(this.repo.courseId, this.repo.assignment, this.repo.name, { filterString: '.*'});
    }

    render(){
        return html`
            <p>${this.repo.name}</p>
            <button @click=${this.refresh}>Refresh</button>
            <ul>
                <li>Filter (regex): <input type="text" value=".*" disabled></li>
                ${when(this.repoStats, () => html`
                    <li>Added: ${this.repoStats.totalAdded} / Removed: ${this.repoStats.totalRemoved}</li>
                    <li>Authors:
                        <ul>
                            ${map(Object.keys(this.repoStats.authors), a => html`
                                <li>${a}, Added: ${this.repoStats.authors[a].added} / Removed: ${this.repoStats.authors[a].removed}</li>
                            `)}
                        </ul>

                    </li>
                    `)}
                
            </ul>

            `
    }
}