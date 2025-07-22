import express from "express"
import { promisify } from "util";
import { S3App } from "./main/index";

let expressApp = express();
const listen = promisify(expressApp.listen).bind(expressApp);
const getRegistry : {[channel: string]: any} = {};

export function get(path: string = '') {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        getRegistry[path] = {
            propertyKey,
            handler: descriptor.value,
            target
        };
    }
}

export async function setupWebHandlers(app: S3App) {
    let appAsAny = <any> app;
    console.log('Setting up web handlers for ', Object.keys(getRegistry));

    for(let path of Object.keys(getRegistry)) {
        let entry = getRegistry[path];
        let owningObject = app;
        
        for(let key of Object.keys(app)){
            if(entry.target.constructor === appAsAny[key].constructor){
                owningObject = appAsAny[key];
                break;
            }
        }
        console.log('Adding GET for ', path);
        expressApp.get(path, async (req, res) => {            
            let params = req.params;
            let result = entry.handler.apply(owningObject, params)
            if(result.then){
                result.then((r: any) => res.send(r));
            }else{
                res.send(result);
            }            
        });        
    }
    
    
    await listen(3000);
}
