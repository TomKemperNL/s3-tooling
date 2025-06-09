import { BlameStatisticsDTO, combineStats, RepoDTO, RepoStatisticsDTO, StatsFilter, StudentFilter } from "../shared";
import { Db } from "./db";
import { FileSystem } from "./filesystem-client";
import { GithubClient } from "./github-client";
import { ProjectStatistics } from "./project-statistics";
import { RepositoryStatistics } from "./repository-statistics";

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
   
    constructor(private db: Db, private githubClient: GithubClient, private fileSystem: FileSystem) {

    }
    
    async getRepoStats(courseId: number, assignment: string, name: string, filter: StatsFilter): Promise<RepoStatisticsDTO> {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);

        let [stats, issues, prs] = await Promise.all([
            await this.fileSystem.getRepoStats(savedCourseConfig.githubStudentOrg, assignment, name),
            await this.githubClient.listIssues(savedCourseConfig.githubStudentOrg, name),
            await this.githubClient.listPullRequests(savedCourseConfig.githubStudentOrg, name)
        ]);

        let coreStats = new RepositoryStatistics(stats);
        let projectStats = new ProjectStatistics(issues, prs);
        let authorsGrouped = coreStats.groupByAuthor().map(st => st.getLinesTotal());
        let prAuthorsGrouped = projectStats.groupByAuthor().map(st => st.getLines());
        let totals = coreStats.getLinesTotal();
        let prTotals = projectStats.getLines();


        let totalPerWeek = coreStats
            .groupByWeek(savedCourseConfig.startDate)
            .map(st => st.getLinesTotal())
        let prTotalPerWeek = projectStats
            .groupByWeek(savedCourseConfig.startDate)
            .map(st => st.getLines())
        let authorPerWeek = coreStats
            .groupByAuthor().map(st =>
                st.groupByWeek(savedCourseConfig.startDate)
                    .map(st => st.getLinesTotal()))
        let prAuthorPerWeek = projectStats
            .groupByAuthor().map(st =>
                st.groupByWeek(savedCourseConfig.startDate)
                    .map(st => st.getLines()))

        return {
            total: {
                added: totals.added + prTotals.added,
                removed: totals.removed + prTotals.removed
            },
            authors: authorsGrouped.combine(prAuthorsGrouped, combineStats).export(),
            weekly: {
                total: totalPerWeek.combine(prTotalPerWeek, combineStats).export(),
                authors: authorPerWeek
                    .combine(prAuthorPerWeek, (ea1, ea2) => ea1.combine(ea2, combineStats)).export()
            }
        };
    }



    async getBlameStats(courseId: number, assignment: string, name: string, filter: StatsFilter): Promise<BlameStatisticsDTO> {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        let [blamePie, issues, prs] = await Promise.all([
            this.fileSystem.getBlame(savedCourseConfig.githubStudentOrg, assignment, name),
            this.githubClient.listIssues(savedCourseConfig.githubStudentOrg, name),
            this.githubClient.listPullRequests(savedCourseConfig.githubStudentOrg, name)
        ]);
        let projectStats = new ProjectStatistics(issues, prs);
        let docsPie: { [name: string]: number } = projectStats.groupByAuthor().map(st => st.getLines().added).export();

        return {
            blamePie: mergePies(blamePie, docsPie)
        };
    }

    async getStatsByUser(courseId: number, assignment: string, name: string, filter: StudentFilter) {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);

        let [stats, issues, prs] = await Promise.all([
            this.fileSystem.getRepoStats(savedCourseConfig.githubStudentOrg, assignment, name),
            this.githubClient.listIssues(savedCourseConfig.githubStudentOrg, name),
            this.githubClient.listPullRequests(savedCourseConfig.githubStudentOrg, name)
        ]);

        let coreStats = new RepositoryStatistics(stats);
        let projectStats = new ProjectStatistics(issues, prs);

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

        let groups = [
            RepositoryStatistics.backend,
            RepositoryStatistics.frontend,
            RepositoryStatistics.markup,
            RepositoryStatistics.docs
        ]

        let total = studentStats.groupBy(groups).map(g => g.getLinesTotal());
        let prTotal = prStudentStats.asGrouped("Communication").map(g => g.getLines());

        let weekly = studentStats.groupByWeek(savedCourseConfig.startDate)
            .map(w => w.groupBy(groups).map(g => g.getLinesTotal()));
        let prWeekly = prStudentStats.groupByWeek(savedCourseConfig.startDate)
            .map(w => w.asGrouped("Communication").map(g => g.getLines()));


        let length = Math.max(weekly.length, prWeekly.length);
        prWeekly = prWeekly.pad(length,
            new ProjectStatistics([], []).asGrouped("Communication").map(g => g.getLines()));
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