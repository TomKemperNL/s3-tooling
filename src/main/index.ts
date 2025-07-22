import { GithubClient } from "./github-client";
import { FileSystem } from "./filesystem-client";
import { CanvasClient } from "./canvas-client";

import { db } from "./db";
import { ReposController } from "./repos-controller";
import { CoursesController } from "./courses-controller";

import { saveSettings, loadSettings } from "./settings";
import { StatisticsController } from "./statistics-controller";
import { setupIpcMainHandlers } from "../electron-setup";
import { Settings } from "../shared";
import { setupWebHandlers } from "../web-setup";

export class S3App{
    githubClient: GithubClient;
    fileSystem: FileSystem;
    canvasClient: CanvasClient;
    repoController: ReposController;
    coursesController: CoursesController;
    statisticsController: StatisticsController;
    #settings: Settings;

    constructor(settings: Settings){
        this.#settings = settings;
    }

    get settings(){
        return this.#settings;
    }

    async init(){        
        await this.reload(this.settings);
        if (!this.settings.keepDB) {
            await db.reset().then(() => db.test());
        } else {
            console.log('keeping db');
        }       
    }

    async reload(settings: Settings){ //Nog niet async, maar ik vermoed dat dit wel ooit nodig gaat zijn... (en dan is retroactief async maken vaak vrij ingrijpend)
        this.#settings = settings;
        this.githubClient = new GithubClient(this.settings.githubToken);
        this.fileSystem = new FileSystem(this.settings.dataPath);
        this.canvasClient = new CanvasClient(this.settings.canvasToken);
        
        this.repoController = new ReposController(db, this.canvasClient, this.githubClient, this.fileSystem);    
        this.coursesController = new CoursesController(db, this.canvasClient),
        this.statisticsController = new StatisticsController(db, this.githubClient, this.fileSystem, this.repoController);
    }
}

export async function main() {
    let settings = await loadSettings();
    let app = new S3App(settings);
    await app.init();

    setupIpcMainHandlers(app);
    setupWebHandlers(app);
}