import { BackendApi } from "../backend-api";

declare global {
    interface Window {
        electron: BackendApi;
    }
}