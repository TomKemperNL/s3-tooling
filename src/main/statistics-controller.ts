import { group } from "console";
import { PieDTO, combineStats, CourseConfig, LinesStatistics, RepoDTO, RepoStatisticsDTO, RepoStatisticsDTOPerGroup, StatsFilter, StudentFilter } from "../shared";
import { Db } from "./db";
import { FileSystem } from "./filesystem-client";
import { GithubClient } from "./github-client";
import { ProjectStatistics } from "./project-statistics";
import { RepositoryStatistics } from "./repository-statistics";
import { ReposController } from "./repos-controller";
import { CombinedStats, GroupDefinition, StatsBuilder } from "./statistics";
import { ipc } from "../electron-setup";
import { StatsApi } from "../backend-api";

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

function mergeAuthors(pie: { [name: string]: number }, mapping: { [name: string]: string}){
    let merged: { [name: string]: number } = {};
    for (let key in pie) {
        let mapped = mapping[key] || key; // Als er geen mapping is, gebruik de originele naam
        merged[mapped] = (merged[mapped] || 0) + pie[key];
    }
    return merged;
}

function filterAuthors(mapping: { [name: string]: string}, target: string){
    let filtered: { [name: string]: string } = {};
    for (let key in mapping) {
        if (mapping[key] && mapping[key].trim() === target) {
            filtered[key] = mapping[key];
        }
    }
    return filtered;
}

function mappingToAliases(mapping: { [name: string]: string}) : { [canonical: string]: string[] } {
    let aliases: { [canonical: string]: string[] } = {};
    for (let alias in mapping) {
        let canonical = mapping[alias];
        if (!aliases[canonical]) {
            aliases[canonical] = [];
        }
        aliases[canonical].push(alias);
    }
    return aliases;
}

export class StatisticsController implements StatsApi {
    constructor(private db: Db, private githubClient: GithubClient, private fileSystem: FileSystem,
        private repoController: ReposController //TODO: deze willen we niet als dep, maar voor nu...
    ) {

    }
    

    #getGroups(savedCourseConfig: CourseConfig) {
        //TODO: voor nu hardcoded, maar dit wil je per cursus kunnen instellen
        return [
            RepositoryStatistics.backend,
            RepositoryStatistics.frontend,
            RepositoryStatistics.markup,
            RepositoryStatistics.docs,
            { name: 'Communication', extensions: undefined }
        ];
    }

    async #getCombinedStats(savedCourseConfig: CourseConfig, assignment: string, name: string) {        
        let [coreStats, projectStats] = await Promise.all([
            this.#getRepoStats(savedCourseConfig.githubStudentOrg, assignment, name),
            this.#getProjectStats(savedCourseConfig.githubStudentOrg, name),        
        ]);
        let stats = new CombinedStats([coreStats, projectStats]);        
        return stats;
    }

    async #getRepoStats(org: string, assignment: string, name: string) {
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

    async getCourseStats(courseId: number, assignment: string) {
        let savedCourse = await this.db.getCourse(courseId);
        let result: { [section: string]: any } = {};

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
        let groupedTotals: any = {
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

    async getClassStats(courseId: number, assignment: string, section: string): Promise<any> {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        let groups = this.#getGroups(savedCourseConfig);

        let repos = await this.repoController.loadRepos(courseId, assignment, { sections: [section] });

        let teamResults: { [repo: string]: any } = {};
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
            let groupsGrouped = coreStats.groupBy(groups).map(st => st.getLinesTotal());
            let prGroupsGrouped = projectStats.groupBy(groups).map(st => st.getLinesTotal());


            teamResults[repo.name] = {
                total: combineStats(totals, prTotals),
                groups: groupsGrouped.combine(prGroupsGrouped, combineStats).export(),
                weekly: totalPerWeek.combine(prTotalPerWeek, combineStats).export()
            };
        }

        await Promise.all(repos.map(addRepo));

        let totals = Object.keys(teamResults).reduce((acc: any, key) => {
            acc[key] = teamResults[key].total;
            return acc;
        }, {});
        let weeklies = Object.keys(teamResults).reduce((acc: any, key) => {
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

    @ipc("repostats:get")
    async getRepoStats(courseId: number, assignment: string, name: string, filter: StatsFilter): Promise<RepoStatisticsDTO> {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);        

        let combinedStats = await this.#getCombinedStats(savedCourseConfig, assignment, name);
        let lastDate = combinedStats.getDateRange().end;

        let authorMapping = await this.db.getAuthorMapping(savedCourseConfig.githubStudentOrg, name);
        combinedStats.mapAuthors(authorMapping);

        let repoMembers = await this.db.getCollaborators(savedCourseConfig.githubStudentOrg, name);

        // TODO: docenten er uit filteren... dat maakt het nu slechter dan accounts die niets hebben gedaan er uit filteren
        // let allAuthors : string[] = [...new Set(combinedStats.getDistinctAuthors().concat(repoMembers.map(m => m.login)))];        
        let allAuthors = combinedStats.getDistinctAuthors();

        let builder = new StatsBuilder(combinedStats);
        return {
            aliases: mappingToAliases(authorMapping),
            total: builder.build(),
            authors: builder.groupByAuthor(allAuthors).build(),
            weekly: {
                total: builder.groupByWeek(savedCourseConfig.startDate, lastDate).build(),
                authors: builder
                    .groupByAuthor(allAuthors)
                    .thenByWeek(savedCourseConfig.startDate, lastDate)
                    .build()
            }
        };
    }

    async getRepoStatsByGroup(courseId: number, assignment: string, name: string, filter: StatsFilter): Promise<RepoStatisticsDTOPerGroup> {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);

        let combinedStats = await this.#getCombinedStats(savedCourseConfig, assignment, name);        
        let authorMapping = await this.db.getAuthorMapping(savedCourseConfig.githubStudentOrg, name);
        combinedStats.mapAuthors(authorMapping);

        let lastDate = combinedStats.getDateRange().end;

        let builder = new StatsBuilder(combinedStats);

        return {
            total: builder.build(),
            groups: builder.groupBy(this.#getGroups(savedCourseConfig)).build(),
            weekly: {
                total: builder.groupByWeek(savedCourseConfig.startDate, lastDate).build(),
                groups: builder
                    .groupBy(this.#getGroups(savedCourseConfig))
                    .thenByWeek(savedCourseConfig.startDate, lastDate)
                    .build()
            }
        };
    }

    @ipc("repostats-mapping:update")
    async updateAuthorMapping(courseId: number, name: string, mapping: { [author: string]: string }) {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        await this.db.updateAuthorMapping(savedCourseConfig.githubStudentOrg, name, mapping);
    }

    @ipc("repostats-aliases:remove")
    async removeAlias(courseId: number, name: string, aliases: { [canonical: string]: string[]; }) :Promise<void> {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        await this.db.removeAliases(savedCourseConfig.githubStudentOrg, name, aliases);
    }


    @ipc("repostats-blame:get")
    async getBlameStats(courseId: number, assignment: string, name: string, filter: StatsFilter): Promise<PieDTO> {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        
        let [gitPie, projectStats] = await Promise.all([
            this.fileSystem.getLinesByAuthorPie(savedCourseConfig.githubStudentOrg, assignment, name),
            this.#getProjectStats(savedCourseConfig.githubStudentOrg, name)
        ]);
        
        let authorMapping = await this.db.getAuthorMapping(savedCourseConfig.githubStudentOrg, name)
        projectStats.mapAuthors(authorMapping);        
        gitPie = mergeAuthors(gitPie, authorMapping);

        let docsPie: { [name: string]: number } = projectStats.groupByAuthor(projectStats.getDistinctAuthors()).map(st => st.getLinesTotal().added).export();

        return {
            aliases: mappingToAliases(authorMapping),
            pie: mergePies(gitPie, docsPie)
        };
    }

    @ipc("repostats-group-pie:get")
    async getGroupPie(courseId: number, assignment: string, name: string, filter: StatsFilter): Promise<PieDTO> {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        let authorMapping = await this.db.getAuthorMapping(savedCourseConfig.githubStudentOrg, name)
        let [gitPie, projectStats] = await Promise.all([
            this.fileSystem.getLinesByGroupPie(this.#getGroups(savedCourseConfig), savedCourseConfig.githubStudentOrg, assignment, name),
            this.#getProjectStats(savedCourseConfig.githubStudentOrg, name)
        ]);
        let docsPie: { [name: string]: number } = { "Docs" : projectStats.getLinesTotal().added }

        return {
            aliases: mappingToAliases(authorMapping),
            pie: mergePies(gitPie, docsPie)
        };
    }

    @ipc("repostats-student:get")
    async getStudentStats(courseId: number, assignment: string, name: string, filter: StudentFilter) {
        let savedCourseConfig = await this.db.getCourseConfig(courseId);
        let groups = this.#getGroups(savedCourseConfig);
        let stats = await this.#getCombinedStats(savedCourseConfig, assignment, name);
        let authorMapping = await this.db.getAuthorMapping(savedCourseConfig.githubStudentOrg, name);
        stats.mapAuthors(authorMapping);
        authorMapping = filterAuthors(authorMapping, filter.authorName);

        let endDate = stats.getDateRange().end;
        let byAuthor = stats.groupByAuthor([filter.authorName]);

        let studentStats = byAuthor.get(filter.authorName);

        let builder = new StatsBuilder(studentStats);

        return {
            aliases: mappingToAliases(authorMapping),
            total: builder.groupBy(groups).build(),
            weekly: builder
                .groupByWeek(savedCourseConfig.startDate, endDate)
                .thenBy(groups).build(),
        }
    }
}