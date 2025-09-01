import importMapping from './../../usermappingS2.json';
import { db } from "./../../src/main/db";
import { StatisticsController } from "./../../src/main/statistics-controller";
import { StringDict } from '../../src/main/canvas-client';


const mapping = <any>importMapping;
async function main() {
    let controller = new StatisticsController(db, null, null, null);

    for(let klas in mapping){
        console.log(`Klas: ${klas}`);
        for(let repo in mapping[klas]){
            let repoMapping : StringDict = {};
            for(let alias in mapping[klas][repo]['mapped']){
                let value = mapping[klas][repo]['mapped'][alias];
                if(alias === value){
                    continue;
                }
                if(value === '???'){
                    continue;
                }
                repoMapping[alias] = value;
            }
            // await controller.updateAuthorMapping(44633, repo, repoMapping);
            console.log(`\thttps://s3.tomkemper.nl/stats/44633/sd-s2-project/${repo}`);
                
                
        }
    }
}

main();