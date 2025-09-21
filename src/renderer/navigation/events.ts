import { Page } from "./pages";

export class NavigationRequestedEvent extends Event {
    static EVENT_NAME = "navigation-requested";
    constructor(public page: Page) {
        super(NavigationRequestedEvent.EVENT_NAME, { bubbles: true, composed: true });
    }
}