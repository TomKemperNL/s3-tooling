import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AuthorStatisticsDTO, BlameStatisticsDTO, LinesStatistics, RepoDTO, RepoStatisticsDTO, RepoStatisticsPerWeekDTO } from "../core";
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


    @property({ type: String, state: true })
    activeAuthorName: string = '';
    @property({ type: Object })
    activeAuthor: AuthorStatisticsDTO;

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

    authors: { [name: string]: boolean } = {};
    protected willUpdate(_changedProperties: PropertyValues): void {
        if (_changedProperties.has('repoStats')) {
            this.authors = {};
            for (let a of Object.keys(this.repoStats!.authors)) {
                this.authors[a] = true;
            }
        }
    }

    toggleAuthor(authorName: string) {
        return e => {
            this.authors[authorName] = e.target.checked;
            this.requestUpdate();
        }
    }

    selectStudent(authorName: string) {
        return (e: Event) => {
            this.activeAuthorName = authorName;
            this.ipc.getStudentStats(
                this.repo.courseId,
                this.repo.assignment,
                this.repo.name,
                { authorName: authorName }).then(
                    authorStats => {
                        console.log('received author stats', authorStats);
                        this.activeAuthor = authorStats;
                    });

        };
    }



    static styles = css`
    :host {
        display: grid;
        grid-template-areas:
            "bar     bar"
            "numbers pie";
    }

    .loading {
        opacity: 0.5;
    }
    ul {
        list-style: none;
    }
    `

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

    authorToColor(author: string): string {
        let authors = Object.keys(this.authors);
        return this.colors[authors.indexOf(author) % this.colors.length];
    }

    toDatasets(statsByWeek: RepoStatisticsPerWeekDTO): any[] {
        let datasets: any[] = [];

        for (let a of Object.keys(this.authors)) {
            if (!this.authors[a]) {
                continue;
            }
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

    render() {
        let labels: string[] = [];
        let datasets: any[] = [];

        let blameLabels: string[] = [];
        let blameValues: number[] = [];
        let blameColors: string[] = [];

        if (this.repoStats) {

            for (let i = 0; i < this.repoStats.weekly.total.length; i++) {
                labels.push('Week ' + (i + 1));
            }
            datasets = this.toDatasets(this.repoStats.weekly!);
        }

        if (this.blameStats) {
            for (let a of Object.keys(this.blameStats?.blamePie)) {
                if (!this.authors[a]) {
                    continue;
                }
                blameLabels.push(a);
                blameValues.push(this.blameStats.blamePie[a]);
                blameColors.push(this.authorToColor(a));
            }
        }

        return html`
        <div class=${classMap({ loading: this.loading })}>
            <p>${this.repo.name}</p>
            <ul style="grid-area: numbers;">
                <li>Filter (regex): <input type="text" value=".*" disabled></li>
                ${when(this.repoStats, () => html`
                    <li>Added: ${this.repoStats!.total.added} / Removed: ${this.repoStats!.total.removed}</li>
                    <li>Authors:
                        <ul>
                            ${map(Object.keys(this.repoStats!.authors), a => html`
                                <li><input type="checkbox" ?checked=${this.authors[a]} @change=${this.toggleAuthor(a)}>
                                    <button @click=${this.selectStudent(a)} type="button">Select</button>
                                    <span style="color: ${this.authorToColor(a, Object.keys(this.repoStats!.authors))}">${a}</span>, 
                                    Added: ${this.repoStats!.authors[a].added} / Removed: ${this.repoStats!.authors[a].removed}</li>
                            `)}
                        </ul>

                    </li>
                    `)}
                
            </ul>
            
        </div>
        ${when(this.repoStats, () => html`
            <stacked-bar-chart 
                class=${classMap({ loading: this.loading })} 
                style="grid-area: bar" 
                .labels=${labels} 
                .datasets=${datasets}></stacked-bar-chart>
            <pie-chart 
                class=${classMap({ loading: this.loading })} 
                style="grid-area: pie" 
                .labels=${blameLabels}
                .values=${blameValues}
                .colors=${blameColors}></pie-chart>
        `)}

        
        ${when(this.activeAuthor, () => html`
                <student-details .authorName=${this.activeAuthorName} .authorStats=${this.activeAuthor}></student-details>
            `)}

        `;
    }
}