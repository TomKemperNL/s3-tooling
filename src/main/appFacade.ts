import { Db } from "./db";
import { CanvasClient } from "./canvas_client";
import { GithubClient } from "./github_client";
import { CourseConfig, CourseDTO, Repo, RepoDTO, RepoFilter, RepositoryStatistics, StatsFilter } from "../core";
import { FileSystem as FileSystemClient } from "./filesystem_client";

//Naming things is hard :(
export class AppFacade {
    constructor(private githubClient: GithubClient, private canvasClient: CanvasClient, private fileSystem: FileSystemClient, private db: Db){

    }

    async getConfigs(): Promise<CourseConfig[]>{
        return this.db.getCourseConfigs();
    }

    async loadCourse(id) : Promise<CourseDTO>{
        let savedCourse = await this.db.getCourse(id);        
        if (Object.keys(savedCourse.sections).length === 0) {

            let sections = await this.canvasClient.getSections({ course_id: id });
            for (let section of sections) {
                if (section.name === savedCourse.name) {
                    continue; //Elke cursus heeft zo'n sectie waar 'iedereen' in zit. Die lijkt me niet handig?
                }
                savedCourse.sections[section.name] = section.students.map(s => ({
                    name: s.name,
                    studentId: parseInt(s.sis_user_id),
                    email: s.login_id
                }));
            }

            await this.db.updateSections(savedCourse);
        }

        return savedCourse;
    }

    async loadRepos(courseId, assignment, filter: RepoFilter) : Promise<RepoDTO[]>{
        let savedCourse = await this.db.getCourse(courseId);
        let savedCourseConfig = await this.db.getCourseConfig(courseId);

        let usermapping = await this.canvasClient.getGithubMapping(
            { course_id: courseId },
            { assignment_id: savedCourseConfig.canvasVerantwoordingAssignmentId }
            , savedCourseConfig.verantwoordingAssignmentName);

        await this.db.updateUserMapping(savedCourseConfig.canvasCourseId, usermapping);

        let repoResponses = await this.githubClient.listRepos(savedCourseConfig.githubStudentOrg);
        let repos = repoResponses.map(r => new Repo(r, savedCourseConfig));
        let matchingRepos = repos.filter(r => r.matchesAssignment(assignment));

        let allResults = [];

        for (let section of filter.sections) {
            let matchingLogins = [];

            if (savedCourse.sections[section]) {
                for (let student of savedCourse.sections[section]) {
                    if (usermapping[student.email]) {
                        matchingLogins.push(usermapping[student.email]);
                    }
                }
            }

            let targetRepos = []
            for (let repo of matchingRepos) {
                console.log(assignment);
                console.log(repo)
                if(assignment === savedCourseConfig.verantwoordingAssignmentName){ //TODO: Solo assignments anders behandelen
                    if(matchingLogins.indexOf(repo.owner) >= 0){
                        targetRepos.push(repo);
                    }
                }else{
                    let collaborators = await this.githubClient.getMembers(savedCourseConfig.githubStudentOrg, repo.name);
                    let logins = collaborators.map(c => c.login);
                    if (logins.some(l => matchingLogins.indexOf(l) >= 0)) {
                        targetRepos.push(repo);
                    }
                }                
            }
    
            for (let repo of targetRepos) {
                this.fileSystem.cloneRepo([savedCourseConfig.githubStudentOrg, assignment], repo);
            }

            let results: RepoDTO[] = targetRepos.map(r => ({
                courseId: savedCourse.canvasId,
                assignment: assignment,
                groupRepo: assignment !== savedCourseConfig.verantwoordingAssignmentName,
                name: r.name
            }));

            allResults = allResults.concat(results);
        }
        return allResults;
    }

    async getRepoStats(courseId: number, assignment: string, name: string, filter: StatsFilter){
        let savedCourseConfig = await this.db.getCourseConfig(courseId);

        let stats = await this.fileSystem.getRepoStats(savedCourseConfig.githubStudentOrg, assignment, name);
        let coreStats = new RepositoryStatistics(stats);
        let authors = coreStats.getLinesPerAuthor();
        let totals = coreStats.getLinesTotal()

        return {
            totalAdded: totals.added,
            totalRemoved: totals.removed,
            authors
        };
    }
}