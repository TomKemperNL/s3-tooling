import { Router } from '@vaadin/router';



export default function createRouter(outlet: HTMLElement) {
    const router = new Router(outlet);
    router.setRoutes([
        { path: '/', component: 'home-element' },
        { path: '/stats/:cid/:assignment/:name', component: 'stats-container' }
    ]);

    return router;

}

