import { test, expect } from "vitest";
import { SettingsPage } from "../../src/renderer/settings-page";
import { Settings } from "../../src/shared";
import { BackendApi } from "../../src/backend-api";

class FakeIPC {
    settings : Settings = <any>{};
    async loadSettings() {
        return this.settings; 
    }
    async saveSettings(settings: Settings) {
        this.settings = settings;
    }
    async openDirectory() {
        return "/fake/path";
    }
}

test('Can load settings page', async () => {
        const ipc :FakeIPC = <any>new FakeIPC();
        const settingsPage = new SettingsPage();
        settingsPage.ipc = <any>ipc;
        document.body.appendChild(settingsPage);
        
        await settingsPage.updateComplete;
        await settingsPage.loadComplete;
        expect(settingsPage.settings).toEqual(ipc.settings);
});