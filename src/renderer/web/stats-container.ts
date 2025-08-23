import { Router, RouterLocation } from "@vaadin/router";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { RepoDTO } from "../../shared";

@customElement("stats-container")
export class StatsContainer extends LitElement {
    constructor() {
        super();
    }

    @property({ type: Number, state: true })
    courseId: number;

    @property({ type: String, state: true })
    assignment: string;

    @property({ type: String, state: true })
    repoName: string;

    onAfterEnter(location: RouterLocation, commands: {}, router: Router){
        console.log('StatsContainer.onAfterEnter', location, commands, router);

        this.courseId = location.params.cid ? parseInt((<any>location.params).cid) : null;
        this.assignment = location.params.assignment ? (<any>location.params).assignment : null;
        this.repoName = location.params.name ? (<any>location.params).name : null;
        
    }

    render() {

        let repo : RepoDTO = {
            name: this.repoName,
            courseId: this.courseId,
            assignment: this.assignment,
            members: [],
            groupRepo: true,
            url:''
        }
        return html`
            <div>
                <repository-details .repo=${repo}></repository-details>
            </div>
        `;
    }
}