import * as fs from 'fs';
import * as proc from 'child_process';
import * as path from 'path';
import { readdir } from 'fs/promises'

import { promisify } from 'util';

const exec = promisify(proc.exec);
const newCommitPattern = /(\w+),([\d-]+T[\d:]+[^,]+),([^,]+),(.+)/
const changePattern = /([\d-]+)\s+([\d-]+)\s+(.+)/

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

    cloneRepo(prefix: string[], repo){
        let target = path.join(this.#basePath, ...prefix);
        if(!fs.existsSync(target)){
            fs.mkdirSync(target, {recursive: true});
        }

        proc.execSync(`git clone ${repo.http_url}`, { cwd: target });
    }

    async getRepoPaths(...prefPath: string[]){
        let target = path.join(this.#basePath, ...prefPath);      
        let result = await readdir(target, { withFileTypes: true });
        let dirs = result.filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        return dirs.map(d => prefPath.concat([d]));        
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
}