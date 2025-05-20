import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { BlameStatisticsDTO, RepoDTO, RepoStatisticsDTO } from "../core";
import { when } from "lit/directives/when.js";
import { map } from "lit/directives/map.js";
import { ElectronIPC } from "./ipc";
import { classMap } from "lit/directives/class-map.js";

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
    ipc: ElectronIPC;
    constructor() {
        super();
        this.ipc = window.electron;
        this.repoStats = undefined;
    }

    @property({ type: Object })
    repo: RepoDTO;

    @property({ type: Object, state: true })
    repoStats?: RepoStatisticsDTO;

    @property({ type: Object, state: true })
    blameStats?: BlameStatisticsDTO;

    @property({ type: Boolean, state: true })
    loading: boolean = false;

    protected updated(_changedProperties: PropertyValues): void {
        if (_changedProperties.has('repo')) {
            this.loading = true;

            let gettingRepos = this.ipc.getRepoStats(this.repo.courseId, this.repo.assignment, this.repo.name, { filterString: '' }).then(
                stats => {
                    this.repoStats = stats;
                }
            );
            let gettingBlameStats = this.ipc.getBlameStats(this.repo.courseId, this.repo.assignment, this.repo.name, { filterString: '' }).then(
                stats => {
                    this.blameStats = stats;
                });
            Promise.all([gettingRepos, gettingBlameStats]).then(() => {
                this.loading = false;
            });
        }
    }

    selectStudent(authorName: string) {
        return (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            this.dispatchEvent(new AuthorSelectedEvent(authorName));
        };
    }

    static styles = css`
    :host {
        display: grid;
        grid-template-areas:
            "numbers numbers"
            "bar     pie";
    }

    .loading {
        opacity: 0.5;
    }
    `

    render() {
        let labels: string[] = [];
        let values: number[] = [];
      
        let blameLabels: string[] = [];
        let blameValues: number[] = [];
        
        if (this.repoStats) {
            for (let i = 0; i < this.repoStats.weekly.total.length; i++) {
                labels.push('Week ' + (i + 1));
            }
            values = this.repoStats.weekly?.total.map(w => w.added - w.removed);
        }

        if(this.blameStats){

            for(let a of Object.keys(this.blameStats?.blamePie)){
                blameLabels.push(a);
                blameValues.push(this.blameStats.blamePie[a]);
            }
        }

        return html`
        <div class=${classMap({ loading: this.loading })}>
            <p>${this.repo.name}</p>
            <ul style="grid-area: numbers;">
                <li>Filter (regex): <input type="text" value=".*" disabled></li>
                ${when(this.repoStats, () => html`
                    <li>Added: ${this.repoStats.total.added} / Removed: ${this.repoStats.total.removed}</li>
                    <li>Authors:
                        <ul>
                            ${map(Object.keys(this.repoStats.authors), a => html`
                                <li><button @click=${this.selectStudent(a)} type="button">Select</button>${a}, Added: ${this.repoStats.authors[a].added} / Removed: ${this.repoStats.authors[a].removed}</li>
                            `)}
                        </ul>

                    </li>
                    `)}
                
            </ul>
            
        </div>
        ${when(this.repoStats, () => html`
            <bar-chart class=${classMap({ loading: this.loading })} style="grid-area: bar" .data=${{ labels: labels, values: values }}></bar-chart>
            <pie-chart class=${classMap({ loading: this.loading })} style="grid-area: pie" .data=${{ labels: blameLabels, values: blameValues }}></pie-chart>
        `)}
        `;
    }
}