import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { BackendApi } from "../../backend-api";
import { consume } from "@lit/context";
import { ipcContext } from "../contexts";
import { CriteriaDTO, OverviewDTO, ProgressResult } from "../../shared";


@customElement("canvas-overview")
export class CanvasOverview extends LitElement {

    @property({ type: Number })
    courseId: number;
    @property({ type: Number })
    studentCanvasId: number;


    @consume({ context: ipcContext })
    ipc: BackendApi;

    @property({ type: Object, state: true })
    overview: ProgressResult;

    protected async firstUpdated(_changedProperties: PropertyValues) {        
        this.overview = await this.ipc.getCanvasOverview(this.courseId, this.studentCanvasId)
        console.log(this.overview);
    }

    renderCriterion(criterion: CriteriaDTO) {
        return html`<tr>
        <td>${criterion.description}</td>
        ${criterion.levels.map(level => {
            let resultsInLevel = criterion.results.filter(r => Math.ceil(r.points) === level.points)
            return html`<td class="results-${resultsInLevel.length}">
                <h5>${level.description}</h5>
                <ul>
                    ${resultsInLevel.map(r => {
                        let date = r.submitted_at ? new Date(r.submitted_at) : null;
                        let tooltip = `Points: ${r.points}\nComments: ${r.comments}\nGrader: ${r.grader}\nSubmitted at: ${r.submitted_at}`;
                        let hasTooltip = r.comments && r.comments.length > 0;
                        return html`<li class="${hasTooltip ? 'has-tooltip': ''}"  title=${tooltip}>${date ? `${date.getDate()}-${date.getMonth()}`  : 'No date'}</li>`}
                    )}
                </ul>                
            </td>`})}
        </tr>`    }

    renderAssignment(overview: OverviewDTO){
        return html`
        <table>
        <thead>
            <tr>
                <th><h3>${overview.title}</h3></th>
            </tr>
            <tr>
                <th>Criterion</th>
                <th>Points</th>
            </tr>
        </thead>
        <tbody>
            ${overview.criteria.map(criterion => this.renderCriterion(criterion))}
        </tbody>
        </table>`;
    }

    protected render(){
        return html`
        ${this.overview?.overviews.map(ov => this.renderAssignment(ov))}
        `;
        
    }

    
    static get styles() {
        return css`

            :host {
                display: flex;
                flex-wrap: wrap;
                align-items: flex-start;
                gap: 1em;
                padding: 1em;
                box-sizing: border-box;
            }

            h5, ul {
                margin: 0;
            }

            table {
                border-collapse: collapse;  
                width: 48%;
                margin: 0px;
                padding: 0px;
            }
            th, td {
                border: 1px solid #ddd;
                
            }
            th {
                background-color: #f2f2f2;
                text-align: left;
            }

            /* Dit moet handiger:) */

            .results-0 {
                background-color: rgba(255, 255, 255, 0.2);
            }

            .results-1 {
                background-color: rgba(0, 0, 0, 0.1);
            }
            .results-2 {
                background-color: rgba(0, 0, 0, 0.2);
            }
            .results-3 {
                background-color: rgba(0, 0, 0, 0.3);
            }
            .results-4 {
                background-color: rgba(0, 0, 0, 0.4);
            }

            .results-5 {
                background-color: rgba(255, 159, 64, 0.2);
            }

            .results-6 {
                background-color: rgba(199, 199, 199, 0.2);
            }

            .results-7 {
                background-color: rgba(88, 88, 88, 0.2);
            }

            .has-tooltip {
                border-bottom: 1px dotted black;
                cursor: help;
            }

            li {
                list-style-type: none;
            }
            
            `
            
    }
}

