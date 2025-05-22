import { FileSystem } from "../src/main/filesystem_client";

let fs = new FileSystem('C:/s3-tooling-data');
async function main(){
    const repo = ['HU-SD-S2-studenten-2425', 'sd-s2-project','sd-s2-project-alt-f4'];
    await fs.switchBranch('main', ...repo);
    let result = await fs.getBlame(...repo);
    console.log(result);
    
}

main();

