import { combineStats, CourseConfig, LinesStatistics, RepoDTO, RepoStatisticsDTO, StatsFilter, GroupPieDTO, Assignment } from "../shared";
import { Db } from "./db";
import { FileSystem } from "./filesystem-client";
import { GithubClient } from "./github-client";
import { ProjectStatistics } from "./project-statistics";
import { RepositoryStatistics } from "./repository-statistics";
import { ReposController } from "./repos-controller";
import { CombinedStats, GroupDefinition, Statistics, StatsBuilder } from "./statistics";
import { ipc } from "../electron-setup";
import { StatsApi } from "../backend-api";
import { get, path } from "../web-setup";
import { CoursesController } from "./courses-controller";

function mergeAuthors(pie: { [name: string]: number }, mapping: { [name: string]: string }) {
    const merged: { [name: string]: number } = {};
    for (const key in pie) {
        const mapped = mapping[key] || key; // Als er geen mapping is, gebruik de originele naam
        merged[mapped] = (merged[mapped] || 0) + pie[key];
    }
    return merged;
}

function merge<T>(a: { [key: string]: T[] }, b: { [key: string]: T[] }) {
    let result = { ...a };
    for (let key of Object.keys(b)) {
        if (!result[key]) {
            result[key] = [];
        }
        result[key] = result[key].concat(b[key]);
    }
    return result;
}

function mappingToAliases(mapping: { [name: string]: string }): { [canonical: string]: string[] } {
    const aliases: { [canonical: string]: string[] } = {};
    for (const alias in mapping) {
        const canonical = mapping[alias];
        if (!aliases[canonical]) {
            aliases[canonical] = [];
        }
        aliases[canonical].push(alias);
    }
    return aliases;
}

export class StatisticsController implements StatsApi {
    constructor(private db: Db, private githubClient: GithubClient, private fileSystem: FileSystem,
        private repoController: ReposController, //TODO: deze willen we niet als dep, maar voor nu...
        private courseController: CoursesController //TODO: en deze willen we al helemaaaaal niet
    ) {

    }


    #getGroups(savedCourseConfig: CourseConfig): GroupDefinition[] {
        //TODO: voor nu hardcoded, maar dit wil je per cursus kunnen instellen
        return [
            RepositoryStatistics.backend,
            RepositoryStatistics.frontend,
            RepositoryStatistics.markup,
            RepositoryStatistics.docs,
            { name: 'Communication', projectContent: ["issues", "pullrequests", "comments"] },
            { name: "Other", other: true }
        ];
    }

    async #getCombinedStats(savedCourseConfig: CourseConfig, assignment: Assignment, name: string) {
        const [coreStats, projectStats] = await Promise.all([
            this.#getRepoStats(savedCourseConfig.githubStudentOrg, assignment.name, name),
            this.#getProjectStats(assignment.groupAssignment, savedCourseConfig.githubStudentOrg, name),
        ]);
        const stats = new CombinedStats([coreStats, projectStats]);
        return stats;
    }

    async #getRepoStats(org: string, assignment: string, name: string) {
        const commits = await this.fileSystem.getRepoStats(org, assignment, name);
        return new RepositoryStatistics(commits);
    }

    async #getProjectStats(isGroupAssignment: boolean, org: string, name: string) {
        // Hacky hackmans:
        // We zijn begonnen met heel veel indivduele oefenopdrachten uitdelen
        // Daar willen we stats van tracken
        // Maar als we daar elke keer deze Github API calls voor gaan doen
        // Dan lopen we tegen rate limits aan
        // Dus we nemen even aan dat we voor individuele opdrachten geen Issues & PRs willen uitvragen
        // Als we dat wel willen, dan moeten we de project-stats robuust lokaal gaan opslaan en synchen
        if (!isGroupAssignment) {
            return new ProjectStatistics([], []);
        } else {
            const [issues, prs] = await Promise.all([
                this.githubClient.listIssues(org, name),
                this.githubClient.listPullRequests(org, name)
            ]);
            return new ProjectStatistics(issues, prs);
        }
    }

    async getCourseStats(courseId: number, assignment: string) {
        const savedCourse = await this.db.getCourse(courseId);
        const result: { [section: string]: any } = {};

        const addSection = async (section: string) => {
            const repos = await this.repoController.loadRepos(courseId, assignment, { sections: [section] });
            if (repos.length === 0) {
                return;
            }
            const sectionStats = await this.getClassStats(courseId, assignment, section);
            return sectionStats;
        }
        const totals = {
            added: 0,
            removed: 0
        };
        const groupedTotals: any = {
        }

        for (const section of Object.keys(savedCourse.sections)) {
            const sectionStats = await addSection(section);
            result[section] = sectionStats;
            totals.added += sectionStats.total.added;
            totals.removed += sectionStats.total.removed;

            const sectionGroups = sectionStats.groups;
            for (const group of Object.keys(sectionGroups)) {
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
        const savedCourseConfig = await this.db.getCourseConfig(courseId);
        const foundAssignment = savedCourseConfig.assignments.find(a => a.name === assignment);
        if (!foundAssignment) {
            throw new Error(`Assignment ${assignment} not found in course config`);
        }
        const groups = this.#getGroups(savedCourseConfig);

        const repos = await this.repoController.loadRepos(courseId, assignment, { sections: [section] });

        const teamResults: { [repo: string]: any } = {};
        const addRepo = async (repo: RepoDTO) => {
            const [coreStats, projectStats] = await Promise.all([
                this.#getRepoStats(savedCourseConfig.githubStudentOrg, assignment, repo.name),
                this.#getProjectStats(foundAssignment.groupAssignment, savedCourseConfig.githubStudentOrg, repo.name)
            ]);

            const totals = coreStats.getLinesTotal();
            const prTotals = projectStats.getLinesTotal();
            const totalPerWeek = coreStats
                .groupByWeek(savedCourseConfig.startDate)
                .map(st => st.getLinesTotal())
            const prTotalPerWeek = projectStats
                .groupByWeek(savedCourseConfig.startDate)
                .map(st => st.getLinesTotal())
            const groupsGrouped = coreStats.groupBy(groups).map(st => st.getLinesTotal());
            const prGroupsGrouped = projectStats.groupBy(groups).map(st => st.getLinesTotal());


            teamResults[repo.name] = {
                total: combineStats(totals, prTotals),
                groups: groupsGrouped.combine(prGroupsGrouped, combineStats).export(),
                weekly: totalPerWeek.combine(prTotalPerWeek, combineStats).export()
            };
        }

        await Promise.all(repos.map(addRepo));

        const totals = Object.keys(teamResults).reduce((acc: any, key) => {
            acc[key] = teamResults[key].total;
            return acc;
        }, {});
        const weeklies = Object.keys(teamResults).reduce((acc: any, key) => {
            acc[key] = teamResults[key].weekly;
            return acc;
        }, {});

        const grouped = Object.keys(teamResults).reduce((groupTotals: any, key) => {
            const teamGroups = teamResults[key].groups;
            for (const group of Object.keys(teamGroups)) {
                if (!groupTotals[group]) {
                    groupTotals[group] = { added: 0, removed: 0 };
                }
                groupTotals[group].added = (groupTotals[group].added || 0) + teamGroups[group].added;
                groupTotals[group].removed = (groupTotals[group].removed || 0) + teamGroups[group].removed;
            }
            return groupTotals;
        }, {});

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

    @get('/stats/:cid/:assignment/:name')
    async getRepoStatsBase(@path(":cid") courseId: number, @path(":assignment") assignment: string, @path(":name") name: string) {
        //Voor nu een hack om authentication op dit pad in de SPA toe te kunnen passen, maar eeeeigenlijk hoort dit iets nuttigs te returnen.
        return;
    }

    @ipc("sectionstats:get")
    async getSectionStats(courseId: number, assignment: string, section: string) {

        let [savedCourseConfig,
            savedCourse] = await Promise.all([
                this.db.getCourseConfig(courseId),
                this.db.getCourse(courseId)]);

        if (Object.keys(savedCourse.sections).length === 0) {
            //hack, want eigenlijk moet de flow zo zijn dat alles altijd is ingeladen op tijd
            await this.courseController.loadCourse(courseId);
            savedCourse = await this.db.getCourse(courseId);
        }

        const foundAssignment = savedCourseConfig.assignments.find(a => a.name === assignment);
        if (!foundAssignment) {
            throw new Error(`Assignment ${assignment} not found in course config`);
        }

        const repos = await this.repoController.loadRepos(courseId, assignment, { sections: [section] });
        const mapping = await this.db.getStudentMailToGHUserMapping(courseId);

        const gatheredStats: Statistics[] = [];
        let gatheredAliases: { [canonical: string]: string[] } = {};
        const addRepo = async (repo: RepoDTO) => {
            const combinedStats = await this.#getCombinedStats(savedCourseConfig, foundAssignment, repo.name);
            const authorMapping = await this.db.getAuthorMappingOrg(savedCourseConfig.githubStudentOrg);
            combinedStats.mapAuthors(authorMapping);
            gatheredAliases = merge(gatheredAliases, mappingToAliases(authorMapping));
            gatheredStats.push(combinedStats);
        }

        await Promise.all(repos.map(addRepo));
        let allTheStats: CombinedStats = new CombinedStats(gatheredStats);

        let usersInSection = savedCourse.sections[section].map(m => mapping[m.email]);
        console.log('Users in section:', usersInSection);
        console.log('All authors before filtering:', allTheStats.getDistinctAuthors());
        allTheStats.filterAuthors(usersInSection);

        let distinctAuthors = allTheStats.getDistinctAuthors();

        const groups = this.#getGroups(savedCourseConfig);
        let builder = new StatsBuilder(allTheStats);
        let author_group = builder.groupByAuthor(distinctAuthors)
            .thenBy(groups)
            .build();

        return {
            authors: distinctAuthors,
            groups: groups.map(g => g.name),
            author_group: author_group
        }
    }

    @ipc("repostats:get")
    @get('/stats/:cid/:assignment/:name/weekly')
    async getRepoStats(@path(":cid") courseId: number, @path(":assignment") assignment: string, @path(":name") name: string, filter?: StatsFilter): Promise<RepoStatisticsDTO> {
        const savedCourseConfig = await this.db.getCourseConfig(courseId);
        const foundAssignment = savedCourseConfig.assignments.find(a => a.name === assignment);
        if (!foundAssignment) {
            throw new Error(`Assignment ${assignment} not found in course config`);
        }
        const combinedStats = await this.#getCombinedStats(savedCourseConfig, foundAssignment, name);

        const firstDate = savedCourseConfig.startDate;
        const lastDate = combinedStats.getDateRange().end;

        const groups = this.#getGroups(savedCourseConfig);

        const authorMapping = await this.db.getAuthorMappingOrg(savedCourseConfig.githubStudentOrg);
        combinedStats.mapAuthors(authorMapping);

        if (filter && filter.authors) {
            combinedStats.filterAuthors(filter.authors);
        }

        const members = await this.githubClient.getMembers(savedCourseConfig.githubStudentOrg, name);
        const allAuthors = combinedStats.getDistinctAuthors();
        members.map(m => m.login).forEach(login => {
            if (allAuthors.indexOf(login) === -1) {
                if (filter && filter.authors) {
                    if (filter.authors.indexOf(login) !== -1) {
                        allAuthors.push(login);
                    }
                } else {
                    allAuthors.push(login);
                }
            }
        });
        const builder = new StatsBuilder(combinedStats);

        const week_group_author = builder
            .groupByWeek(firstDate, lastDate)
            .thenBy(groups)
            .thenByAuthor(allAuthors)
            .build();
        return {
            authors: allAuthors,
            groups: groups.map(g => g.name),
            aliases: mappingToAliases(authorMapping),
            week_group_author: week_group_author
        }

    }

    @get('/stats/:cid/:assignment/:name/pie')
    @ipc("repostats-group-pie:get")
    async getGroupPie(@path(":cid") courseId: number, @path(":assignment") assignment: string, @path(":name") name: string, filter?: StatsFilter): Promise<GroupPieDTO> {
        const savedCourseConfig = await this.db.getCourseConfig(courseId);
        const foundAssignment = savedCourseConfig.assignments.find(a => a.name === assignment);
        if (!foundAssignment) {
            throw new Error(`Assignment ${assignment} not found in course config`);
        }
        const authorMapping = await this.db.getAuthorMappingOrg(savedCourseConfig.githubStudentOrg)
        const [gitPie, projectStats] = await Promise.all([
            this.fileSystem.getLinesByGroupThenAuthor(this.#getGroups(savedCourseConfig), savedCourseConfig.githubStudentOrg, assignment, name),
            this.#getProjectStats(foundAssignment.groupAssignment, savedCourseConfig.githubStudentOrg, name)
        ]);

        if (filter && filter.authors) {
            projectStats.filterAuthors(filter.authors);
        }

        const groups = this.#getGroups(savedCourseConfig);
        const comGroup = groups.find(g => g.extensions === undefined);
        const pie = gitPie;
        if (comGroup) {
            const comPie: { [name: string]: number } = projectStats.groupByAuthor(projectStats.getDistinctAuthors()).map(st => st.getLinesTotal().added).export();
            pie[comGroup.name] = comPie;
        }

        for (const group of Object.keys(pie)) {
            let groupPie = pie[group];
            groupPie = mergeAuthors(groupPie, authorMapping);
            pie[group] = groupPie;
        }

        if (filter && filter.authors) {
            for (const group of Object.keys(pie)) {
                const groupPie = pie[group];
                const filteredGroupPie: { [name: string]: number } = {};
                for (const author of Object.keys(groupPie)) {
                    if (filter.authors.indexOf(author) !== -1) {
                        filteredGroupPie[author] = groupPie[author];
                    }
                }
                pie[group] = filteredGroupPie;
            }
        }

        return {
            aliases: mappingToAliases(authorMapping),
            groupedPie: pie
        };
    }
}