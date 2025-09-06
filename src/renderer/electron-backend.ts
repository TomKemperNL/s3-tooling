import { BackendApi, ScreenshotApi } from "../backend-api";

declare global {
    interface Window {
        electron: BackendApi & ScreenshotApi;
    }
}