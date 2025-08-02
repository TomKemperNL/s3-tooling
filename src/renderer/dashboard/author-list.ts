import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { map } from "lit/directives/map.js";
import { styleMap } from "lit/directives/style-map.js";
import { BackendApi } from "../../backend-api";
import { consume } from "@lit/context";
import { ipcContext } from "../contexts";
import { when } from "lit/directives/when.js";


export type AuthorItem = {
    name: string;
    color: string;
    member: boolean;
    enabled: boolean;
    aliases: string[];
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

export class AuthorMappedEvent extends Event {
    static eventName = 'author-mapped';
    constructor(public mapping: Record<string, string>) {
        super(AuthorMappedEvent.eventName, {
            bubbles: true,
            composed: true
        });
    }
}

export class RemoveAliasEvent extends Event {
    static eventName = 'remove-alias';
    constructor(public author: string, public alias: string) {
        super(RemoveAliasEvent.eventName, {
            bubbles: true,
            composed: true
        });
    }
}

@customElement('author-list')
export class AuthorList extends LitElement {

    @consume({ context: ipcContext })
    ipc: BackendApi;

    @property({ type: Array })
    authors: AuthorItem[] = [];
    @property({ type: Object })
    authorMapping: Record<string, string> = {};

    @property({ type: Boolean, state: true })
    dragging: boolean;


    constructor() {
        super();
    }

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

    startDrag(author: AuthorItem) {
        return (e: DragEvent) => {
            this.dragging = true;
            e.dataTransfer!.setData('text/plain', author.name);
            e.dataTransfer!.effectAllowed = 'move';
        };
    }
    endDrag(author: AuthorItem) {
        return (e: DragEvent) => {
            this.dragging = false;
            e.dataTransfer!.clearData();
        };
    }

    dropAuthor(author: AuthorItem) {
        return (e: DragEvent) => {
            e.preventDefault();
            const draggedAuthorName = e.dataTransfer!.getData('text/plain');            
            let mapping: Record<string, string> = {};
            mapping[draggedAuthorName] = author.name;

            this.dispatchEvent(new AuthorMappedEvent(mapping));
        };
    }

    dragover(author: AuthorItem) {
        return (e: DragEvent) => {
            e.preventDefault(); // Necessary to allow dropping
            if (author.member) {
                e.dataTransfer!.dropEffect = 'move'; // Show move cursor
            } else {
                e.dataTransfer!.dropEffect = 'none'; // Show no-drop cursor
            }
        };
    }

    removeAlias(author: AuthorItem, alias: string) {
        return (e: Event) => {
            e.preventDefault();
            this.dispatchEvent(new RemoveAliasEvent(author.name, alias));
        };
    }

    static styles = css`
    .author {
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
        let styles = (a: AuthorItem) => ({ //De VSCode formatter wordt helemaal gek als je dit inline probeert te doen:)
            color: a.color,
            "font-style": a.member ? 'normal' : 'italic',
            "cursor": a.member ? 'default' : 'grab',
            "border": this.dragging && a.member ? '1px dashed black' : 'none'
        });

        let item =  (a: AuthorItem) => html`
            <span class="author"
                draggable=${a.member ? 'false' : 'true'} 
                style=${styleMap(styles(a))}
                @dragstart=${this.startDrag(a)}
                @dragend=${this.endDrag(a)}
                @drop=${this.dropAuthor(a)}
                @dragover=${this.dragover(a)}
                >
            ${a.name}</span>
            `

        return html`    
                <ul>
                    ${map(this.authors, (a: AuthorItem) => html`
                        <li> <input type="checkbox" ?checked=${a.enabled} @change=${this.toggleAuthor(a)}>
            <!-- <button @click=${this.selectAuthor(a)} type="button">Select</button> -->
                            ${when(a.aliases.length > 0, () => html`
                            <details>
                            <summary>
                                ${item(a)}
                            </summary>
                                <ul>
                                    ${map(a.aliases, (alias: string) => html`
                                        <li>${alias} <button @click=${this.removeAlias(a, alias)}>Unlink</button></li>
                                    `)}
                                </ul>
                            </details>                            
                            `, () => html`
                            ${item(a)}
                            `)}                                                  
                       </li>
                    `)}
                </ul>

    
        `;
    }
}

// <!-- Added: ${this.repoStats!.authors[a].added} / Removed: ${this.repoStats!.authors[a].removed} -->