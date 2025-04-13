import { RepositoryStatistics } from './core';
import { FileSystem } from './main/filesystem_client'


async function main(){

    let fs = new FileSystem();
    let ownStats = await fs.getOwnStats();
    let stats = new RepositoryStatistics(ownStats);

    console.log(stats.getLinesTotal());
    console.log(stats.getLinesPerAuthor());
}

main();
