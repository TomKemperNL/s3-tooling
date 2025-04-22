import { RepositoryStatistics } from './core';
import { FileSystem } from './main/filesystem_client'


async function main(){

    let fs = new FileSystem();
    // let ownStats = await fs.getOwnStats();
    // let stats = new RepositoryStatistics(ownStats);

    // console.log(stats.getLinesTotal());
    // console.log(stats.getLinesPerAuthor());
    // console.log(stats.getLinesPerWeek());
    
    let result = await fs.getBlame('HU-SD-S2-studenten-2425', 'sd-s2-project','sd-s2-project-commit');
    // let result = await fs.getBlame('../gittools');
    console.log(result);
}

main();
