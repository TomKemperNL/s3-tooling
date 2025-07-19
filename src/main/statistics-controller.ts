import { group } from "console";
import { BlameStatisticsDTO, combineStats, CourseConfig, LinesStatistics, RepoDTO, RepoStatisticsDTO, RepoStatisticsDTOPerGroup, StatsFilter, StudentFilter } from "../shared";
import { Db } from "./db";
import { FileSystem } from "./filesystem-client";
import { GithubClient } from "./github-client";
import { ProjectStatistics } from "./project-statistics";
import { RepositoryStatistics } from "./repository-statistics";
import { ReposController } from "./repos-controller";
import { CombinedStats, GroupDefinition } from "./statistics";

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
    
    #getGroups(savedCourseConfig: CourseConfig){
        //TODO: voor nu hardcoded, maar dit wil je per cursus kunnen instellen
        return [
            RepositoryStatistics.backend,
            RepositoryStatistics.frontend,
            RepositoryStatistics.markup,
            RepositoryStatistics.docs
        ];
    }
    
    async #getCombinedStats(savedCourseConfig: CourseConfig, assignment: string, name: string) {
        let groups = this.#getGroups(savedCourseConfig);
        let [coreStats, projectStats] = await Promise.all([
            this.#getRepoStats(groups, savedCourseConfig.githubStudentOrg, assignment, name),
            this.#getProjectStats(savedCourseConfig.githubStudentOrg, name)
        ]);
        return new CombinedStats([coreStats, projectStats]);
    }

    async #getRepoStats(groups: GroupDefinition[], org: string, assignment: string, name: string){        
        let commits = await this.fileSystem.getRepoStats(org, assignment, name);
        return new RepositoryStatistics(commits);
    }

    async #getProjectStats(org: string, name: string) {
        let [issues, prs] = await Promise.all([
            this.githubClient.listIssues(org, name),
            this.githubClient.listPullRequests(org, name)
        ]);
        return new ProjectStatistics("Communication", issues, prs);        
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
            return sectionStats;
        }
        let totals = {
            added: 0,
            removed: 0
        };
        let groupedTotals : any = {
        }

        for (let section of Object.keys(savedCourse.sections)) {
            let sectionStats = await addSection(section);
            result[section] = sectionStats;
            totals.added += sectionStats.total.added;
            totals.removed += sectionStats.total.removed;

            let sectionGroups = sectionStats.groups;
            for (let group of Object.keys(sectionGroups)) {
                if (!groupedTotals[group]) {
                    groupedTotals[group] = { added: 0, removed: 0 };
                }
                groupedTotals[group].added += sectionGroups[group].added;
                groupedTotals[group].removed += sectionGroups[group].removed;
            }
        }

        return {
            total: totals,
            sections: result,
            groups: groupedTotals
        };
    }

    async getClassStats(courseId: number, assignment: string, section: string) : Promise<any>{
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        let groups = this.#getGroups(savedCourseConfig);

        let repos = await this.repoController.loadRepos(courseId, assignment, { sections: [section] });

        let teamResults : { [repo: string]: any }= {};
        let addRepo = async (repo: RepoDTO) => {
            let [coreStats, projectStats] = await Promise.all([
                this.#getRepoStats(this.#getGroups(savedCourseConfig), savedCourseConfig.githubStudentOrg, assignment, repo.name),
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
            let groupsGrouped = coreStats.groupBy(groups).map(st => st.getLinesTotal());
            let prGroupsGrouped = projectStats.groupBy(groups).map(st => st.getLinesTotal());
        
                
            teamResults[repo.name] = {
                total: combineStats(totals, prTotals),
                groups: groupsGrouped.combine(prGroupsGrouped, combineStats).export(),
                weekly: totalPerWeek.combine(prTotalPerWeek, combineStats).export()
            };
        }

        await Promise.all(repos.map(addRepo));
        
        let totals = Object.keys(teamResults).reduce((acc : any, key) => {
            acc[key] = teamResults[key].total;
            return acc;
        }, {});
        let weeklies = Object.keys(teamResults).reduce((acc : any, key) => {
            acc[key] = teamResults[key].weekly;
            return acc;
        }, {});
        
        let grouped = Object.keys(teamResults).reduce((groupTotals: any, key) => {
            let teamGroups = teamResults[key].groups;
            for (let group of Object.keys(teamGroups)) {
                if (!groupTotals[group]) {
                    groupTotals[group] = { added: 0, removed: 0 };
                }
                groupTotals[group].added = (groupTotals[group].added || 0) + teamGroups[group].added;
                groupTotals[group].removed = (groupTotals[group].removed || 0) + teamGroups[group].removed;
            }
            return groupTotals;
        }, {});
        console.log("Grouped", grouped);

        return {
            total: {
                added: Object.values(totals).reduce(
                    (acc: number, stat: LinesStatistics) => acc + stat.added, 0),
                removed: Object.values(totals).reduce(
                    (acc: number, stat: LinesStatistics) => acc + stat.removed, 0)
            },
            teams: totals,
            groups: grouped,
            // weekly: weeklies
        };
    }

    //Todo: courseconfig wegwerken... te weinig nodig om een hele DB dependency te pakken
    async getRepoStats(courseId: number, assignment: string, name: string, filter: StatsFilter): Promise<RepoStatisticsDTO> {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        
        let combinedStats = await this.#getCombinedStats(savedCourseConfig, assignment, name);
        let lastDate = combinedStats.getDateRange().end;

        let byAuthor = combinedStats.groupByAuthor();
        let byWeek = combinedStats.groupByWeek(savedCourseConfig.startDate);
        let byAuthorByWeek = byAuthor.map(st =>
            st.groupByWeek(savedCourseConfig.startDate, lastDate));
        
        return {
            total: combinedStats.getLinesTotal(),
            authors: byAuthor.map(st => st.getLinesTotal()).export(),
            weekly: {
                total: byWeek.map(st => st.getLinesTotal()).export(),
                authors: byAuthorByWeek.map(st =>
                    st.map(g => g.getLinesTotal())).export()
            }
        };
    }

    async getRepoStatsByGroup(courseId: number, assignment: string, name: string, filter: StatsFilter): Promise<RepoStatisticsDTOPerGroup> {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        
        let combinedStats = await this.#getCombinedStats(savedCourseConfig, assignment, name);
        let lastDate = combinedStats.getDateRange().end;

        let bySubject = combinedStats.groupBy(this.#getGroups(savedCourseConfig));
        let byWeek = combinedStats.groupByWeek(savedCourseConfig.startDate);
        let bySubjectByWeek = bySubject.map(st =>
            st.groupByWeek(savedCourseConfig.startDate, lastDate));

        return {
            total: combinedStats.getLinesTotal(),
            groups: bySubject.map(s => s.getLinesTotal()).export(),
            weekly: {
                total: byWeek.map(s => s.getLinesTotal()).export(),
                groups: bySubjectByWeek.map(s1 => s1.map(s2 => s2.getLinesTotal())).export()
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

    async getStatsByUser(courseId: number, assignment: string, name: string, filter: StudentFilter) {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        let groups = this.#getGroups(savedCourseConfig);
        let stats = await this.#getCombinedStats(savedCourseConfig, assignment, name);
        let endDate = stats.getDateRange().end;
        let byAuthor = stats.groupByAuthor();

        let studentStats = byAuthor.get(filter.authorName);
        if (!studentStats){
            studentStats = new CombinedStats([]);
        }

        let bySubject = studentStats.groupBy(groups);
        let byWeek = studentStats.groupByWeek(savedCourseConfig.startDate, endDate);
        let byWeekBySubject = byWeek.map(st =>
            st.groupBy(groups));

        return {
            total: bySubject.map(st => st.getLinesTotal()).export(),
            weekly: byWeekBySubject.map(s1 => s1.map(s2 => s2.getLinesTotal())).export(),
        }
    }
}