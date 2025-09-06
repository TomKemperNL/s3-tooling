import { BackendApi, BackendEvents } from "../backend-api";

declare global {
    interface Window {
        electron: BackendApi & BackendEvents;
    }
}