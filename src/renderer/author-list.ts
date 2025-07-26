import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { map } from "lit/directives/map.js";
import { styleMap } from "lit/directives/style-map.js";


export type AuthorItem = {
    name: string;
    color: string;
    member: boolean;
    enabled: boolean;
}

export class AuthorSelectedEvent extends Event {
    static eventName = 'author-selected';
    constructor(public authorName: string) {
        super(AuthorSelectedEvent.eventName, {
            bubbles: true,
            composed: true
        });
    }
}

export class EnabledAuthorsChanged extends Event {
    static eventName = 'enabled-authors-changed';
    constructor(public enabledAuthors: string[]) {
        super(EnabledAuthorsChanged.eventName, {
            bubbles: true,
            composed: true
        });
    }
}

@customElement('author-list')
export class AuthorList extends LitElement {

    @property({ type: Array })
    authors: AuthorItem[] = [];


    constructor() {
        super();
    }

    static styles = css``;

    toggleAuthor(author: AuthorItem) {
        return (e: Event) => {
            author.enabled = (<HTMLInputElement>e.target).checked;
            this.dispatchEvent(new EnabledAuthorsChanged(this.authors.filter(a => a.enabled).map(a => a.name)));
        };
    }

    selectAuthor(author: AuthorItem) {
        return (e: Event) => {
            this.dispatchEvent(new AuthorSelectedEvent(author.name));
        };
    }

    render() {
        return html`
    
                <ul>
                    ${map(this.authors, (a: AuthorItem) => html`

                        <li draggable=${a.member ? 'false' : 'true'} ><input type="checkbox" ?checked=${a.enabled} @change=${this.toggleAuthor(a)}>
                            <button @click=${this.selectAuthor(a)} type="button">Select</button>
                            <span style=${styleMap({color: a.color, "font-style": a.member ? 'normal' : 'italic'})} >${a.name}</span>                                 
                       </li>
                    `)}
                </ul>

    
        `;
    }
}

// <!-- Added: ${this.repoStats!.authors[a].added} / Removed: ${this.repoStats!.authors[a].removed} -->