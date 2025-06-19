import * as fs from 'fs';
import * as proc from 'child_process';
import * as path from 'path';
import { readdir } from 'fs/promises'

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

export function parseBlame(blameLines: string[]): { [author: string]: number } {
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

function combineReports(rep1: {[author:string]: number} , rep2: {[author:string]: number} ) {
    let result: {[author:string]: number} = {};
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

export class FileSystem {
    #basePath: string;

    constructor(basePath: string) {
        if (!basePath) {
            throw new Error('Base path for FileSystemClient cannot be empty');
        }
        this.#basePath = basePath;
    }

    async cloneRepo(prefix: string[], repo: Repo) {
        let target = path.join(this.#basePath, ...prefix);
        let fullTarget = path.join(this.#basePath, ...prefix, repo.name);

        if (await exists(fullTarget)) {
            return;
        }

        if (!await exists(target)) {
            let options = { recursive: true };
            await mkdir(target, options);
        }

        await exec(`git clone "${repo.http_url}"`, { cwd: target });
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
    }

    async getCurrentBranch(...repoPath: string[]) {
        let target = path.join(this.#basePath, ...repoPath);
        let result = await exec(`git branch --show-current`, { cwd: target, encoding: 'utf8' });
        return result.stdout.trim();
    }

    async getDefaultBranch(...repoPath: string[]) {
        let target = path.join(this.#basePath, ...repoPath);
        let result = await exec(`git remote show origin`, { cwd: target, encoding: 'utf8' });
        let lines = result.stdout.split('\n');

        let defaultBranchLine = lines.find(line => line.trim().startsWith('HEAD branch:'));
        if (defaultBranchLine) {
            return defaultBranchLine.replace('HEAD branch:', '').trim();
        } else {
            throw new Error('Could not determine default branch');
        }
    }

    async getBranches(defaultBranch: string, ...repoPath: string[]) {
        let target = path.join(this.#basePath, ...repoPath);
        let result = await exec(`git branch --all --remote --no-merge "${defaultBranch}"`, { cwd: target, encoding: 'utf8' });
        let branches = result.stdout.split('\n').filter(b => b.length > 0).map(b => b.trim());
        branches = branches.map(b => b.replace(/origin\//, ''));
        branches = branches.filter(b => b.indexOf('HEAD') === -1);

        branches = [...new Set(branches.sort())];
        return branches;
    }


    async switchBranch(targetBranch: string, ...repoPath: string[]) {
        let target = path.join(this.#basePath, ...repoPath);
        //checkout -f, want in principe hebben we geen changes,
        //maar mac/linux/windows kunnen issues hebben met line endings,
        //en dat soort ellende. Dat negeren we maar...
        await exec(`git checkout -f "${targetBranch}"`, { cwd: target });
    }

    repoCache: { [repoPath: string]: LoggedCommit[] } = {};

    async getRepoStats(...repoPath: string[]) {
        let target = path.join(this.#basePath, ...repoPath);
        if (this.repoCache[target]) {
            return this.repoCache[target];
        }
        let result = await exec(`git log ${logFormat}`, { cwd: target, encoding: 'utf8' });
        let logLines = result.stdout.split('\n');

        let parsedLog = parseLog(logLines);
        this.repoCache[target] = parsedLog;
        return parsedLog;
    }

    async getGroupBlame(groups: GroupDefinition[], ...repoPath: string[]) {
        let target = path.join(this.#basePath, ...repoPath);
        let filesRaw = await exec(`git ls-files`, { cwd: target, encoding: 'utf8' });
        let report : {[groups:string]: number} = {};

        return report;
    }


    async getBlame(...repoPath: string[]) {
        let target = path.join(this.#basePath, ...repoPath);
        let filesRaw = await exec(`git ls-files`, { cwd: target, encoding: 'utf8' });


        let files = filesRaw.stdout.split('\n').filter(f => f.length > 0).map(f => f.trim());
        let report : {[author:string]: number} = {};

        //Het is jammer, maar helaas dat git blame anders omgaat met binary files dan git log. Dus het zal nog even klooien zijn om er voor te zorgen
        //dat die 2 getallen met elkaar gaan matchen.
        async function blameFile(file: string) {
            //git log filtert binaries er ook uit, maar cost een extra console call. Dus een lijstje opbouwen van files die we vaak tegenkomen en echt niet hoeven
            //te checken is handig qua performance
            let hardcodedBinaryExtensions = ['.pdf', '.png', '.jar', '.zip', '.jpeg', '.webp', '.pptx', '.docx', '.xslx'];

            if (file.endsWith('.json')) { //TODO samentrekken met de core.ts Repostats class, maar hier hebben we het middenin IO nodig:S
                return;
            }
            if (hardcodedBinaryExtensions.some(ext => file.toLowerCase().endsWith(ext))) {
                return;
            }
            if (file.indexOf('node_modules/') !== -1) { //.gitignore is moeilijk soms...
                return;
            }
            if (file.indexOf('target/') !== -1) {
                return;
            }

            let soloLog = null;
            try {
                soloLog = await exec(`git log -1 ${logFormat} \"${file}\"`, { cwd: target, encoding: 'utf8' });
            } catch (e) {
                //Als er een casing-probleem (zelfde file bestaat/bestond onder meerdere spellingen) is, 
                // dan geeft git log hier een hele vreemde error
                console.error('Error in git log', e);
                return;
            }

            let logLines = soloLog.stdout.split('\n');
            let [parsedLog] = parseLog(logLines);

            if (parsedLog.changes.length === 0) {
                return; //Ignore merge commits without any other changes
            } else if (parsedLog.changes.some(c => c.added === '-' || c.removed === '-')) {
                return; //Ignore binary files
            }
            else if (!ignoredAuthors.some(ia => ia === parsedLog.author)) {
                try {
                    let blame = await exec(`git blame \"${file}\"`, { cwd: target, encoding: 'utf8', maxBuffer: 5 * 10 * 1024 * 1024 });
                    let blameLines = blame.stdout.split('\n');
                    let fileResults = parseBlame(blameLines);
                    report = combineReports(report, fileResults);
                } catch (e) {
                    console.error('Error in blame', logLines, e);
                }
            }
        }
        await Promise.all(files.map(f => blameFile(f)));
        return report;
    }
}