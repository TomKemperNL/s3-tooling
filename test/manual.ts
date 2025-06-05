import { FileSystem } from "../src/main/filesystem-client";

let fs = new FileSystem('C:/s3-tooling-data');
async function main(){
    console.time("blame")
    
    const repo = ['HU-SD-S2-studenten-2425', 'sd-s2-project','sd-s2-project-samensterk'];
    // await fs.switchBranch('main', ...repo);
    let result = await fs.getBlame(...repo);
    console.log(result);
    // let branches = await fs.getBranches(...repo);
    // console.log(branches);
    // await fs.refreshRepo(...repo);
    // for(let b of branches){
    //     console.log(b);
    //     await fs.switchBranch(b, ...repo);
    //     result = await fs.getBlame(...repo);
    //     console.log(result);
    // }
    console.timeEnd("blame")
}

main();

