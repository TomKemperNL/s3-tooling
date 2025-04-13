import { html, LitElement } from "lit";
import { RepoDTO } from "../core";
import { customElement, property } from "lit/decorators.js";
import { map } from "lit/directives/map.js";

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

    render(){
        return html`
        <ul>
            ${map(this.repos, r => html`
                <li>${r.name} <button @click=${this.selectRepo(r)}>Select</button></li>
                `)}
        </ul>`;
    }
}