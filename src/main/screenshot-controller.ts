import { writeFile } from "fs/promises";
import * as path from "path";

export class ScreenshotController {
    async requestScreenshot(webContents: Electron.WebContents, fileName: string) {
        const image = await webContents.capturePage();
        const img = image.toPNG();
    
        
        const filePath = path.join("./screenshots", `${fileName}.png`);
        await writeFile(filePath, img);
    }
}