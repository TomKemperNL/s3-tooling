import * as fs from 'fs';
import * as proc from 'child_process';
import * as path from 'path';
import { readdir } from 'fs/promises'

import { promisify } from 'util';

const exec = promisify(proc.exec);
const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);
const newCommitPattern = /(\w+),([\d-]+T[\d:]+[^,]+),([^,]+),(.+)/
const changePattern = /([\d-]+)\s+([\d-]+)\s+(.+)/
const blamePattern = /(\w+)\s+\((.+?)\s/

export function parseDate(date){
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

export function parseLog(logLines: string[]) : LoggedCommit[] {
    let commits = [];
    let currentCommit : LoggedCommit = null;

    for(let line of logLines){
        let newCommitMatch = line.match(newCommitPattern);
        
        if(newCommitMatch){
            if(currentCommit != null){
                commits.push(currentCommit);
            }
            currentCommit = {
                hash: newCommitMatch[1],
                date: parseDate(newCommitMatch[2]),
                author: newCommitMatch[3],
                subject: newCommitMatch[4],
                changes: []
            }
        }else{
            let changeMatch = line.match(changePattern)
            if(changeMatch){
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

export class FileSystem {
    #basePath = './../s3-tooling-data';

    async cloneRepo(prefix: string[], repo){
        let target = path.join(this.#basePath, ...prefix);
        let fullTarget = path.join(this.#basePath, ...prefix, repo.name);
        
        if(await exists(fullTarget)){
            return;
        }

        if(!await exists(target)){
            let options = { recursive: true};
            await mkdir(target, options);
        }

        await exec(`git clone ${repo.http_url}`, { cwd: target });
        return fullTarget;
    }

    async getRepoPaths(...prefPath: string[]){
        let target = path.join(this.#basePath, ...prefPath);      
        let result = await readdir(target, { withFileTypes: true });
        let dirs = result.filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        return dirs.map(d => prefPath.concat([d]));        
    }

    async refreshRepo(...repoPath: string[]){
        let target = path.join(this.#basePath, ...repoPath);
        await exec(`git fetch --all`, { cwd: target }); //Dit is te sloom om altijd te doen       
    }

    async getRepoStats(...repoPath: string[]){
        let target = path.join(this.#basePath, ...repoPath);
        let result = await exec(`git log --all --format=%H,%aI,%an,%s --numstat`, { cwd: target, encoding: 'utf8' });
        let logLines = result.stdout.split('\n');
        
        let parsedLog = parseLog(logLines);
        return parsedLog;
    }

    async getOwnStats(){
        let result = await exec(`git log --all --format=%H,%aI,%an,%s --numstat`, { encoding: 'utf8' });
        let logLines = result.stdout.split('\n');
        
        let parsedLog = parseLog(logLines);
        return parsedLog;
    }

    async getBlame(...repoPath: string[]){
        let target = path.join(this.#basePath, ...repoPath);
        let filesRaw = await exec(`git ls-files`, { cwd: target, encoding: 'utf8' });
        
        
        let files = filesRaw.stdout.split('\n').filter(f => f.length > 0).map(f => f.trim());
        let report = {};

        async function blameFile(file: string){
            if(file.endsWith('.json')){ //TODO samentrekken met de core.ts Repostats class, maar hier hebben we het middenin IO nodig:S
                return;
            }

            let soloLog = await exec(`git log -1 --oneline --numstat \"${file}\"`, { cwd: target, encoding: 'utf8' });
            let logLines = soloLog.stdout.split('\n');
            let match = logLines[1].match(changePattern);
            if(match && match[1] !== '-'){
                let blame = await exec(`git blame \"${file}\"`, { cwd: target, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
                let blameLines = blame.stdout.split('\n');
                for(let line of blameLines){
                    let blameMatch = line.match(blamePattern);
                    if(blameMatch && blameMatch[2]){
                        let author = blameMatch[2].trim();
                        
                        if(!report[author]){
                            report[author] = 0;
                        }
                        report[author]++;
                    }
                }
            }            
        }

        await Promise.all(files.map(f => blameFile(f)));
        return report;
    }
}