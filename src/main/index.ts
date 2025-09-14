import { GithubClient } from "./github-client";
import { FileSystem } from "./filesystem-client";
import { CanvasClient } from "./canvas-client";

import { Db, db } from "./db";
import { ReposController } from "./repos-controller";
import { CoursesController } from "./courses-controller";

import { loadSettings } from "./settings";
import { StatisticsController } from "./statistics-controller";
import { Settings } from "../shared";
import { ScreenshotController } from "./screenshot-controller";

export class S3App {
    githubClient: GithubClient;
    fileSystem: FileSystem;
    canvasClient: CanvasClient;
    repoController: ReposController;
    coursesController: CoursesController;
    statisticsController: StatisticsController;
    screenshotController: ScreenshotController;
    db: Db = db;
    #settings: Settings;

    constructor(settings: Settings) {
        this.#settings = settings;
    }

    get settings() {
        return this.#settings;
    }

    async init() {
        try {
            await this.reload(this.settings);
        } catch (e) {
            console.error('Error initializing app:', e);
        }
        // console.log(this.settings)
        if (!this.settings.keepDB) {
            await db.reset().then(() => db.test());
        } else {
            console.log('keeping db');
        }
    }

    /* eslint @typescript-eslint/require-await: "off" */
    async reload(settings: Settings) { //Nog niet async, maar ik vermoed dat dit wel ooit nodig gaat zijn... (en dan is retroactief async maken vaak vrij ingrijpend)
        this.#settings = settings;
        this.screenshotController = new ScreenshotController();
        this.githubClient = new GithubClient(this.settings.githubToken);
        this.fileSystem = new FileSystem(this.settings.dataPath);
        this.canvasClient = new CanvasClient(this.settings.canvasToken);

        this.repoController = new ReposController(db, this.canvasClient, this.githubClient, this.fileSystem);
        this.coursesController = new CoursesController(db, this.canvasClient);
        this.statisticsController = new StatisticsController(db, this.githubClient, this.fileSystem, this.repoController);
    }

    async isAuthorized(user: string, session: any, params: { courseId: number, assignment: string, repository: string }) { //TODO: dit moet op org/repo niveau, niet op hardcoded setting niveau
        // console.debug(`Checking if user ${user} is authorized to access course ${params.courseId}, assignment ${params.assignment}, repository ${params.repository}`);
        let allowed = this.#settings.authorizedUsers.indexOf(user) !== -1;


        if (!allowed && params.courseId && params.assignment && params.repository) {

            if (session && session.allowedRepos) {
                allowed = session.allowedRepos.indexOf(`${params.courseId}/${params.assignment}/${params.repository}`) !== -1;
            }

            if (!allowed) {
                const course = await this.db.getCourseConfig(params.courseId);
                if (course) {
                    const members = await this.githubClient.getCollaborators(course.githubStudentOrg, params.repository);
                    allowed = members.map(m => m.login).indexOf(user) !== -1;

                    if (allowed && session) {
                        session.allowedRepos = session.allowedRepos || [];
                        session.allowedRepos.push(`${params.courseId}/${params.assignment}/${params.repository}`);
                    }
                }
            }
        }
        // console.debug(`User ${user} is ${allowed ? '' : 'not '}authorized to access course ${params.courseId}, assignment ${params.assignment}, repository ${params.repository}`);
        return allowed;
    }
}

export async function createApp() {
    const settings = await loadSettings();
    const app = new S3App(settings);
    await app.init();
    return app;
}