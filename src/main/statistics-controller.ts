import { group } from "console";
import { BlameStatisticsDTO, combineStats, CourseConfig, LinesStatistics, RepoDTO, RepoStatisticsDTO, RepoStatisticsDTOPerGroup, StatsFilter, StudentFilter } from "../shared";
import { Db } from "./db";
import { FileSystem } from "./filesystem-client";
import { GithubClient } from "./github-client";
import { ProjectStatistics } from "./project-statistics";
import { RepositoryStatistics } from "./repository-statistics";
import { ReposController } from "./repos-controller";

function mergePies(pie1: { [name: string]: number }, pie2: { [name: string]: number }): { [name: string]: number } {
    let merged: { [name: string]: number } = {};
    for (let key in pie1) {
        merged[key] = (merged[key] || 0) + pie1[key];
    }
    for (let key in pie2) {
        merged[key] = (merged[key] || 0) + pie2[key];
    }
    return merged;
}

export class StatisticsController {
    constructor(private db: Db, private githubClient: GithubClient, private fileSystem: FileSystem, 
        private repoController: ReposController //TODO: deze willen we niet als dep, maar voor nu...
    ) {

    }
    
    async #getRepoStats(org: string, assignment: string, name: string){
        let commits = await this.fileSystem.getRepoStats(org, assignment, name);
        return new RepositoryStatistics(commits);
    }

    async #getProjectStats(org: string, name: string) {
        let [issues, prs] = await Promise.all([
            this.githubClient.listIssues(org, name),
            this.githubClient.listPullRequests(org, name)
        ]);
        return new ProjectStatistics(issues, prs);        
    }

    async getCourseStats(courseId: number, assignment: string){
        
        let savedCourse = await this.db.getCourse(courseId);
        
        let result : { [section: string]: any } = {};
        
        let addSection = async (section: string) => {
            let repos = await this.repoController.loadRepos(courseId, assignment, { sections: [section] });
            if (repos.length === 0) {
                return;
            }
            let sectionStats = await this.getClassStats(courseId, assignment, section);
            result[section] = sectionStats;
        }
        for (let section of Object.keys(savedCourse.sections)) {
            await addSection(section);
        }

        return result;
    }

    async getClassStats(courseId: number, assignment: string, section: string) : Promise<any>{
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        let repos = await this.repoController.loadRepos(courseId, assignment, { sections: [section] });

        let result : { [repo: string]: any }= {};
        let addRepo = async (repo: RepoDTO) => {
            let [coreStats, projectStats] = await Promise.all([
                this.#getRepoStats(savedCourseConfig.githubStudentOrg, assignment, repo.name),
                this.#getProjectStats(savedCourseConfig.githubStudentOrg, repo.name)
            ]);

            let totals = coreStats.getLinesTotal();
            let prTotals = projectStats.getLinesTotal();
            let totalPerWeek = coreStats
                .groupByWeek(savedCourseConfig.startDate)
                .map(st => st.getLinesTotal())
            let prTotalPerWeek = projectStats
                .groupByWeek(savedCourseConfig.startDate)
                .map(st => st.getLinesTotal())
                
            result[repo.name] = {
                total: combineStats(totals, prTotals),
                weekly: totalPerWeek.combine(prTotalPerWeek, combineStats).export()
            };
        }

        await Promise.all(repos.map(addRepo));
        
        let totals = Object.keys(result).reduce((acc : any, key) => {
            acc[key] = result[key].total;
            return acc;
        }, {});
        let weeklies = Object.keys(result).reduce((acc : any, key) => {
            acc[key] = result[key].weekly;
            return acc;
        }, {});

        return {
            total: {
                added: Object.values(totals).reduce(
                    (acc: number, stat: LinesStatistics) => acc + stat.added, 0),
                removed: Object.values(totals).reduce(
                    (acc: number, stat: LinesStatistics) => acc + stat.removed, 0)
            },
            teams: totals,
            weekly: weeklies
        };
    }

    //Todo: courseconfig wegwerken... te weinig nodig om een hele DB dependency te pakken
    async getRepoStats(courseId: number, assignment: string, name: string, filter: StatsFilter): Promise<RepoStatisticsDTO> {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        let [coreStats, projectStats] = await Promise.all([
            this.#getRepoStats(savedCourseConfig.githubStudentOrg, assignment, name),
            this.#getProjectStats(savedCourseConfig.githubStudentOrg, name)
        ]);

        let totals = coreStats.getLinesTotal();
        let prTotals = projectStats.getLinesTotal();

        let authorsGrouped = coreStats.groupByAuthor().map(st => st.getLinesTotal());
        let prAuthorsGrouped = projectStats.groupByAuthor().map(st => st.getLinesTotal());

        let totalPerWeek = coreStats
            .groupByWeek(savedCourseConfig.startDate)
            .map(st => st.getLinesTotal())
        let prTotalPerWeek = projectStats
            .groupByWeek(savedCourseConfig.startDate)
            .map(st => st.getLinesTotal())
        
        let authorPerWeek = coreStats
            .groupByAuthor().map(st =>
                st.groupByWeek(savedCourseConfig.startDate)
                    .map(st => st.getLinesTotal()))
        let prAuthorPerWeek = projectStats
            .groupByAuthor().map(st =>
                st.groupByWeek(savedCourseConfig.startDate)
                    .map(st => st.getLinesTotal()))

        return {
            total: combineStats(totals, prTotals),
            authors: authorsGrouped.combine(prAuthorsGrouped, combineStats).export(),
            weekly: {
                total: totalPerWeek.combine(prTotalPerWeek, combineStats).export(),
                authors: <any>authorPerWeek //TODO: deze any is een bug denk ik...
                    .combine(prAuthorPerWeek, (ea1, ea2) => ea1.combine(ea2, combineStats)).export()
            }
        };
    }

    async getRepoStatsByGroup(courseId: number, assignment: string, name: string, filter: StatsFilter): Promise<RepoStatisticsDTOPerGroup> {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        let [coreStats, projectStats] = await Promise.all([
            this.#getRepoStats(savedCourseConfig.githubStudentOrg, assignment, name),
            this.#getProjectStats(savedCourseConfig.githubStudentOrg, name)
        ]);
        let groups = this.#getGroups(savedCourseConfig);

        let totals = coreStats.getLinesTotal();
        let prTotals = projectStats.getLinesTotal();

        let groupsGrouped = coreStats.groupByAuthor().map(st => st.getLinesTotal());
        let prGroupsGrouped = projectStats.asGrouped("Communication").map(st => st.getLinesTotal());

        let totalPerWeek = coreStats
            .groupByWeek(savedCourseConfig.startDate)
            .map(st => st.getLinesTotal())
        let prTotalPerWeek = projectStats
            .groupByWeek(savedCourseConfig.startDate)
            .map(st => st.getLinesTotal())
        
        let groupsPerWeek = coreStats
            .groupBy(groups).map(st =>
                st.groupByWeek(savedCourseConfig.startDate)
                    .map(st => st.getLinesTotal()))
        let prGroupsPerWeek = projectStats
            .asGrouped("Communication").map(st =>
                st.groupByWeek(savedCourseConfig.startDate)
                    .map(st => st.getLinesTotal()))

        return {
            total: combineStats(totals, prTotals),
            groups: groupsGrouped.combine(prGroupsGrouped, combineStats).export(),
            weekly: {
                total: totalPerWeek.combine(prTotalPerWeek, combineStats).export(),
                groups: <any>groupsPerWeek //TODO: deze any is een bug denk ik...
                    .combine(prGroupsPerWeek, (ea1, ea2) => ea1.combine(ea2, combineStats)).export()
            }
        };
    }



    async getBlameStats(courseId: number, assignment: string, name: string, filter: StatsFilter): Promise<BlameStatisticsDTO> {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        let [blamePie, projectStats] = await Promise.all([
            this.fileSystem.getBlame(savedCourseConfig.githubStudentOrg, assignment, name),
            this.#getProjectStats(savedCourseConfig.githubStudentOrg, name)
        ]);
        let docsPie: { [name: string]: number } = projectStats.groupByAuthor().map(st => st.getLinesTotal().added).export();

        return {
            blamePie: mergePies(blamePie, docsPie)
        };
    }

    #getGroups(savedCourseConfig: CourseConfig){
        return [
            RepositoryStatistics.backend,
            RepositoryStatistics.frontend,
            RepositoryStatistics.markup,
            RepositoryStatistics.docs
        ];
    }

    async getStatsByUser(courseId: number, assignment: string, name: string, filter: StudentFilter) {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        let [coreStats, projectStats] = await Promise.all([
            this.#getRepoStats(savedCourseConfig.githubStudentOrg, assignment, name),
            this.#getProjectStats(savedCourseConfig.githubStudentOrg, name)
        ]);

        let groupedByAuthor = coreStats.groupByAuthor();
        let prGroupedByAuthor = projectStats.groupByAuthor();

        let studentStats = groupedByAuthor.get(filter.authorName);
        let prStudentStats = prGroupedByAuthor.get(filter.authorName);
        if (!prStudentStats) {
            prStudentStats = new ProjectStatistics([], []);
        }
        if (!studentStats) {
            studentStats = new RepositoryStatistics([]);
        }

        let groups = this.#getGroups(savedCourseConfig);

        let total = studentStats.groupBy(groups).map(g => g.getLinesTotal());
        let prTotal = prStudentStats.asGrouped("Communication").map(g => g.getLinesTotal());

        let weekly = studentStats.groupByWeek(savedCourseConfig.startDate)
            .map(w => w.groupBy(groups).map(g => g.getLinesTotal()));
        let prWeekly = prStudentStats.groupByWeek(savedCourseConfig.startDate)
            .map(w => w.asGrouped("Communication").map(g => g.getLinesTotal()));

        let length = Math.max(weekly.length, prWeekly.length);
        prWeekly = prWeekly.pad(length,
            new ProjectStatistics([], []).asGrouped("Communication").map(g => g.getLinesTotal()));
        weekly = weekly.pad(length,
            new RepositoryStatistics([]).groupBy(groups).map(g => g.getLinesTotal()));
        

        let totalCombined = total.combine(prTotal, combineStats);
        let weeklyCombined = weekly.combine(prWeekly, (g1, g2) => {
            return g1.combine(g2, combineStats)
        });

        return {
            total: totalCombined.export(),
            weekly: weeklyCombined.export()
        }
    }
}