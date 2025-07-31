import * as proc from 'child_process';
import { promisify } from 'util';

const exec = promisify(proc.exec);

async function main(){
    try {
        let userInput = "main && dir"
        const command = `git log -1 "${userInput}"`; // Example command
        const { stdout, stderr } = await exec(command, { encoding: 'utf8' });
        
        if (stderr) {
            console.error(`Error: ${stderr}`);
        } else {
            console.log(`Output: ${stdout}`);
        }
    } catch (error) {
        console.error(`Execution failed: ${error.message}`);
    }
}

main();