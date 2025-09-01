import * as fs from 'fs';
import * as proc from 'child_process';
import * as path from 'path';
import { readdir, readFile } from 'fs/promises'

import { promisify } from 'util';
import { ignoredAuthors } from './repository-statistics';
import { Repo } from '../shared';
import { GroupDefinition } from './statistics';

const exec = promisify(proc.exec);
const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);
const newCommitPattern = /(\w+),([\d-]+T[\d:]+[^,]+),([^,]+),(.+)/
const changePattern = /([\d-]+)\s+([\d-]+)\s+(.+)/
const blamePattern = /(\w+)\s+\((.+?)\d\d\d\d-\d\d-\d\d/
const logFormat = '--format=%H,%aI,%an,%s --numstat'

export function parseDate(date: string): Date {
    return new Date(Date.parse(date));
}

export type LoggedChange = {
    path: string
    added: number | '-',
    removed: number | '-'
}

export type LoggedCommit = {
    hash: string,
    author: string,
    date: Date,
    subject: string,
    changes: LoggedChange[]
}

export function parseLog(logLines: string[]): LoggedCommit[] {
    let commits = [];
    let currentCommit: LoggedCommit = null;

    for (let line of logLines) {
        let newCommitMatch = line.match(newCommitPattern);

        if (newCommitMatch) {
            if (currentCommit != null) {
                commits.push(currentCommit);
            }
            currentCommit = {
                hash: newCommitMatch[1],
                date: parseDate(newCommitMatch[2]),
                author: newCommitMatch[3],
                subject: newCommitMatch[4],
                changes: []
            }
        } else {
            let changeMatch = line.match(changePattern)
            if (changeMatch) {
                currentCommit.changes.push({
                    added: changeMatch[1] === '-' ? '-' : parseInt(changeMatch[1]),
                    removed: changeMatch[2] === '-' ? '-' : parseInt(changeMatch[2]),
                    path: changeMatch[3]
                })
            }
        }
    }
    commits.push(currentCommit);

    return commits;
}

export function parseBlame(blameLines: string[]): Record<string, number> {
    let report: { [author: string]: number } = {};
    for (let line of blameLines) {
        let blameMatch = line.match(blamePattern);
        if (blameMatch && blameMatch[2]) {
            let author = blameMatch[2].trim();

            if (!report[author]) {
                report[author] = 0;
            }
            report[author]++;
        }
    }
    return report;
}


function combineRecords(rep1: Record<string, number>, rep2: Record<string, number>) {
    let result: Record<string, number> = {};
    function addToReport(key: string, value: number) {
        if (!result[key]) {
            result[key] = 0;
        }
        result[key] += value;
    }

    for (let k of Object.keys(rep1)) {
        addToReport(k, rep1[k]);
    }
    for (let k of Object.keys(rep2)) {
        addToReport(k, rep2[k]);
    }
    return result;
}

export type CloneStyle = 'https' | 'ssh'

export interface GitCommands {
    listFiles(path: string): Promise<string[]>
    getFileLog(path: string, file: string): Promise<LoggedCommit[]>
    getBlame(path: string, file: string): Promise<string[]>
}

class GitCli implements GitCommands {
    async listFiles(target: string) {
        let filesRaw = await exec(`git ls-files`, { cwd: target, encoding: 'utf8' });
        let files = filesRaw.stdout.split('\n').map(f => f.trim()).filter(f => f.length > 0);
        return files
    }

    async getFileLog(target: string, file: string): Promise<LoggedCommit[]> {
        let log = await exec(`git log -10 ${logFormat} \"${file}\"`, { cwd: target, encoding: 'utf8' }); //Deze -10 is een beetje een lelijke gok
        let logLines = log.stdout.split('\n');
        let parsedLog = parseLog(logLines);
        return parsedLog;
    }

    async getBlame(target: string, file: string): Promise<string[]> {
        let blame = await exec(`git blame \"${file}\"`, { cwd: target, encoding: 'utf8', maxBuffer: 5 * 10 * 1024 * 1024 });
        return blame.stdout.split('\n');
    }

}

export class FileSystem {
    #basePath: string;
    cloneStyle: CloneStyle = 'ssh'
    gitCli: GitCommands = new GitCli();

    constructor(basePath: string) {
        if (!basePath) {
            throw new Error('Base path for FileSystemClient cannot be empty');
        }
        this.#basePath = basePath;
    }

    async cloneRepo(prefix: string[], repo: Repo) {
        console.log('Cloning repo', repo.name, 'to', path.join(this.#basePath, ...prefix, repo.name));
        let target = path.join(this.#basePath, ...prefix);
        let fullTarget = path.join(this.#basePath, ...prefix, repo.name);

        if (await exists(fullTarget)) {
            return;
        }

        if (!await exists(target)) {
            let options = { recursive: true };
            await mkdir(target, options);
        }

        if (this.cloneStyle === 'https') {
            await exec(`git clone "${repo.http_url}"`, { cwd: target });
        } else if (this.cloneStyle === 'ssh') {
            await exec(`git clone "${repo.ssh_url}"`, { cwd: target });
        }

        return fullTarget;
    }

    async getRepoPaths(...prefPath: string[]) {
        let target = path.join(this.#basePath, ...prefPath);
        let result = await readdir(target, { withFileTypes: true });
        let dirs = result.filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        return dirs.map(d => prefPath.concat([d]));
    }

    //Dit is te sloom om altijd te doen    
    async refreshRepo(...repoPath: string[]) {
        let target = path.join(this.#basePath, ...repoPath);
        await exec(`git reset HEAD --hard`, { cwd: target });
        await exec(`git fetch --all`, { cwd: target });
        try {
            await exec(`git pull`, { cwd: target });
        } catch (e) {
            //TODO: dit kan gebeuren als de remote branch is verwijderd,
            //moeten we nog beter kunnen detecteren 
            console.error('Error pulling repo', e);
        }


        delete this.repoCache[target];
        delete this.branchCache[target];
    }

    branchCache: { [path: string]: any } = {};

    async getCurrentBranch(...repoPath: string[]) {
        if (this.branchCache[repoPath.join('/')] && this.branchCache[repoPath.join('/')].current) {
            return this.branchCache[repoPath.join('/')].current;
        }

        let target = path.join(this.#basePath, ...repoPath);
        let result = await exec(`git branch --show-current`, { cwd: target, encoding: 'utf8' });
        let output = result.stdout.trim();

        this.branchCache[repoPath.join('/')] = this.branchCache[repoPath.join('/')] || {};
        this.branchCache[repoPath.join('/')].current = output;
        return output;
    }

    async getDefaultBranch(...repoPath: string[]) {
        if (this.branchCache[repoPath.join('/')] && this.branchCache[repoPath.join('/')].default) {
            return this.branchCache[repoPath.join('/')].default;
        }

        let target = path.join(this.#basePath, ...repoPath);
        let result = await exec(`git remote show origin`, { cwd: target, encoding: 'utf8' });
        let lines = result.stdout.split('\n');

        let defaultBranchLine = lines.find(line => line.trim().startsWith('HEAD branch:'));
        if (defaultBranchLine) {
            let output = defaultBranchLine.replace('HEAD branch:', '').trim();

            this.branchCache[repoPath.join('/')] = this.branchCache[repoPath.join('/')] || {};
            this.branchCache[repoPath.join('/')].default = output;
            return output;
        } else {
            throw new Error('Could not determine default branch');
        }
    }

    async getBranches(defaultBranch: string, ...repoPath: string[]) {
        if (this.branchCache[repoPath.join('/')] && this.branchCache[repoPath.join('/')].branches) {
            return this.branchCache[repoPath.join('/')].branches;
        }

        let target = path.join(this.#basePath, ...repoPath);
        let result = await exec(`git branch --all --remote --no-merge "${defaultBranch}"`, { cwd: target, encoding: 'utf8' });
        let branches = result.stdout.split('\n').filter(b => b.length > 0).map(b => b.trim());
        branches = branches.map(b => b.replace(/origin\//, ''));
        branches = branches.filter(b => b.indexOf('HEAD') === -1);

        branches = [...new Set(branches.sort())];

        this.branchCache[repoPath.join('/')] = this.branchCache[repoPath.join('/')] || {};
        this.branchCache[repoPath.join('/')].branches = branches;
        return branches;
    }


    async switchBranch(targetBranch: string, ...repoPath: string[]) {
        let target = path.join(this.#basePath, ...repoPath);
        delete this.branchCache[repoPath.join('/')];
        //checkout -f, want in principe hebben we geen changes,
        //maar mac/linux/windows kunnen issues hebben met line endings,
        //en dat soort ellende. Dat negeren we maar...
        await exec(`git checkout -f "${targetBranch}"`, { cwd: target });
    }

    repoCache: { [repoPath: string]: LoggedCommit[] } = {};

    async getRepoStats(...repoPath: string[]) {
        let target = path.join(this.#basePath, ...repoPath);
        if (this.repoCache[target]) {
            // console.log('cache-hit: repo for', target);
            return this.repoCache[target];
        }
        let result = await exec(`git log --all ${logFormat}`, { cwd: target, encoding: 'utf8' });
        let logLines = result.stdout.split('\n');

        let parsedLog = parseLog(logLines);
        this.repoCache[target] = parsedLog;
        return parsedLog;
    }

    async #includeFileInBlames(path: string, file: string) {
        let hardcodedBinaryExtensions = ['.pdf', '.png', '.jar', '.zip', '.jpeg', '.webp', '.pptx', '.docx', '.xslx'];

        if (file.endsWith('.json')) { //TODO samentrekken met de core.ts Repostats class, maar hier hebben we het middenin IO nodig:S
            return false;;
        }
        if (hardcodedBinaryExtensions.some(ext => file.toLowerCase().endsWith(ext))) {
            return false;;
        }
        if (file.indexOf('node_modules/') !== -1) { //.gitignore is moeilijk soms...
            return false;;
        }
        if (file.indexOf('target/') !== -1) {
            return false;;
        }

        let parsedLog: LoggedCommit[] = null;
        try {
            parsedLog = await this.gitCli.getFileLog(path, file);
            //basically willen we files ignoren die altijd binary zijn, of alleen maar merge-commits hebben.
            //hmm, dat klinkt niet heel logisch: TODO, wat wouden we hier eigenlijk?:)
        } catch (e) {
            //Als er een casing-probleem (zelfde file bestaat/bestond onder meerdere spellingen) is, 
            // dan geeft git log hier een hele vreemde error
            console.error('Error in git log', e);
            return false;
        }


        if (parsedLog.every(l => l.changes.length === 0)) {
            return false;; //Ignore merge commits without any other changes
        } else if (parsedLog.every(l => l.changes.some(c => c.added === '-' || c.removed === '-'))) {
            return false;; //Ignore binary files
        }
        else if (!parsedLog.every(l => ignoredAuthors.some(ia => ia === l.author))) {
            return true;
        } else {
            return false;
        }
    }

    async getLinesByGroupThenAuthor(groups: GroupDefinition[], ...repoPath: string[]): Promise<Record<string, Record<string, number>>> {
        let target = path.join(this.#basePath, ...repoPath);
        let files = await this.gitCli.listFiles(target);
        let repoGroups = groups.filter(g => g.extensions && g.extensions.length > 0);

        let report = {} as Record<string, Record<string, number>>;

        let otherGroup = groups.find(g => g.other);

        async function parseFile(file: string){
            if (await this.#includeFileInBlames(target, file)) {
                let matchingGroup = repoGroups.find(g => g.extensions.some(ext => file.toLowerCase().endsWith(ext.toLowerCase())));
                let blameLines: string[] = await this.gitCli.getBlame(target, file);
                let fileResults = parseBlame(blameLines);

                if (matchingGroup) {
                    report[matchingGroup.name] = report[matchingGroup.name] || {};
                    for (let author of Object.keys(fileResults)) {
                        if (!report[matchingGroup.name][author]) {
                            report[matchingGroup.name][author] = 0;
                        }
                        report[matchingGroup.name][author] += fileResults[author];
                    }
                } else if (otherGroup) {
                    report[otherGroup.name] = report[otherGroup.name] || {};
                    for (let author of Object.keys(fileResults)) {
                        if (!report[otherGroup.name][author]) {
                            report[otherGroup.name][author] = 0;
                        }
                        report[otherGroup.name][author] += fileResults[author];
                    }
                }
            }
        }

        await Promise.all(files.map(f => parseFile.apply(this, [f])));
        
        let orderedReport = {} as Record<string, Record<string, number>>;
        for (let group of groups) {
            if (report[group.name]) {
                orderedReport[group.name] = report[group.name];
            } else {
                orderedReport[group.name] = {};
            }
        }
        return orderedReport;
    }
}