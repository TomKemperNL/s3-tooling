import { html, LitElement } from "lit";
import { RepoDTO } from "../shared";
import { customElement, property } from "lit/decorators.js";
import { map } from "lit/directives/map.js";
import { HTMLInputEvent } from "./events";

export class RepoSelectedEvent extends Event {
    constructor(public repo: RepoDTO){
        super('repo-selected')
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
        let selected = e.target.value;
        if (selected) {
            let repo = this.repos.find(r => r.name === selected);
            if (repo) {
                this.selectRepo(repo)();
            }
        }
    }

    render(){
        return html`
        <select @change=${this.dropdownChange}>
            <option value="">Select a repository</option>
            ${map(this.repos, r => html`
                <option value=${r.name}>${r.name}</option>
                `)}
            </select>`;
    }
}