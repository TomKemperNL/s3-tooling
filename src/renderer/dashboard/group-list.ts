import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { map } from "lit/directives/map.js";
import { styleMap } from "lit/directives/style-map.js";
import { BackendApi } from "../../backend-api";
import { consume } from "@lit/context";
import { ipcContext } from "../contexts";
import { when } from "lit/directives/when.js";


export type GroupItem = {
    name: string;
    color: string;
    enabled: boolean;    
}

export class EnabledItemsChanged extends Event {
    static eventName = 'enabled-items-changed';
    constructor(public enabledGroups: string[]) {
        super(EnabledItemsChanged.eventName, {
            bubbles: true,
            composed: true
        });
    }
}

@customElement('group-list')
export class GroupList extends LitElement {

    @property({ type: Array })
    groups: GroupItem[] = [];

    constructor() {
        super();
    }

    toggleGroup(group: GroupItem) {
        return (e: Event) => {
            group.enabled = (<HTMLInputElement>e.target).checked;
            this.dispatchEvent(new EnabledItemsChanged(this.groups.filter(a => a.enabled).map(a => a.name)));
        };
    }

    static styles = css`
    .group {
        font-size: 1.2em;
        margin: 0.3em 0;
    }
    li {
        list-style-type: none;        
    }
    details {
        display: inline-block;
    }
    `;

    render() {
        return html`    
                <ul>
                    ${map(this.groups, (g: GroupItem) => html`
                        <li> <input type="checkbox" ?checked=${g.enabled} @change=${this.toggleGroup(g)}>            
                           <span class="group"                
                                style=${styleMap({ color: g.color})}
                                >
                            ${g.name}</span>
                           
                       </li>
                    `)}
                </ul>

    
        `;
    }
}