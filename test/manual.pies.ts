import { FileSystem as FileSystemClient } from "../src/main/filesystem-client";

async function main(){
    let gfs = new FileSystemClient(".");
    
    // let pie = await gfs.getLinesByAuthorPie('.');
    // console.log(pie);

    let otherpie = await gfs.getLinesByGroupThenAuthor([
        { name: 'TS', extensions: ['ts', 'tsx'] },
        { name: 'html', extensions: ['html', 'htm'] },
        { name: 'sql', extensions: ['sql'] },
    ],'.');
    console.log(otherpie);

}

main();