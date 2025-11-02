import { html, LitElement } from "lit";
import { RepoDTO } from "../../shared";
import { customElement, property } from "lit/decorators.js";
import { map } from "lit/directives/map.js";
import { HTMLInputEvent } from "../events";
import { NavigationRequestedEvent } from "../navigation/events";

export class RepoSelectedEvent extends Event {
    constructor(public repo: RepoDTO){
        super('repo-selected')
    }
}

export class RepoClearedEvent extends Event {
    constructor() {
        super('repo-cleared')
    }
}

@customElement('repositories-list')
export class RepositoriesList extends LitElement {

    @property({type: Array})
    repos: RepoDTO[] = [];

    selectRepo(repo: RepoDTO){
        return () => {
            this.dispatchEvent(new RepoSelectedEvent(repo));
        }
    }

    dropdownChange(e: HTMLInputEvent) {
        const selected = e.target.value;
        if (selected) {
            const repo = this.repos.find(r => r.name === selected);
            if (repo) {
                this.selectRepo(repo)();
            }
        }else{
            this.dispatchEvent(new RepoClearedEvent());
        }
    }

    goToRepo(){
        this.dispatchEvent(new NavigationRequestedEvent('repo'));
    }

    render(){
        let sortedRepos = [...this.repos].sort((a,b) => a.name.localeCompare(b.name));
        return html`
        <select @change=${this.dropdownChange}>
            <option value="">Select a repository</option>
            ${map(sortedRepos, r => html`
                <option value=${r.name}>${r.name}</option>
                `)}
            </select>
            <custom-carat style="cursor:pointer" @click=${this.goToRepo} direction="right" color="red"></custom-carat>
            `;
    }
}