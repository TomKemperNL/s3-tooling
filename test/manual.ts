import { FileSystem } from "../src/main/filesystem_client";

let fs = new FileSystem('C:/s3-tooling-data');
async function main(){
    const repo = ['HU-SD-S2-studenten-2425', 'sd-s2-project','sd-s2-project-git-gud'];
    await fs.switchBranch('main', ...repo);
    let result = await fs.getRepoStats(...repo);
    console.log('big adds', result.filter(commit => commit.changes.some(c => <number>c.added > 1000)));
    console.log('big removes', result.filter(commit => commit.changes.some(c => <number>c.removed > 1000)));
    
}

main();

