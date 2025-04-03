import * as fs from 'fs';
import * as proc from 'child_process';
import * as path from 'path';

export class FileSystem {
    #basePath = './data';

    cloneRepo(org, repo){
        let target = path.join(this.#basePath, org);
        if(!fs.existsSync(target)){
            fs.mkdirSync(target);
        }

        proc.execSync(`git clone ${repo.ssh_url}`, { cwd: target });
    }
}