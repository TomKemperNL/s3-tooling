import { writeFile } from "fs/promises";
import * as path from "path";

export class ScreenshotController {
    async requestScreenshot(webContents: Electron.WebContents, fileName: string) {
        let image = await webContents.capturePage();
        let img = image.toPNG();
    
        
        const filePath = path.join("./screenshots", `${fileName}.png`);
        await writeFile(filePath, img);
    }
}