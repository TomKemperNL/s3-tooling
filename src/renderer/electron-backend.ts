import { BackendApi } from "./backend";

declare global {
    interface Window {
        electron: BackendApi;
    }
}