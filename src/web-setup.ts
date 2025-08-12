import express from "express"
import { promisify } from "util";
import { S3App } from "./main/index";
import * as fspath from "path";

let expressApp = express();
let apiRouter = express.Router();

expressApp.use('/api', apiRouter);
expressApp.use('/assets', express.static('dist/src/renderer/assets'));
expressApp.get('/*spa', (req, res) => {    
    res.sendFile(fspath.resolve(process.cwd(), 'dist', 'src', 'renderer', 'web.html'));
});

const listen = promisify(expressApp.listen).bind(expressApp);

const PORT = process.env.PORT || 3000;

const getRegistry : {[channel: string]: any} = {};
const paramRegistry : any[] = [];

export function path(value: string) {
    return function(target: any, propertyKey: string, parameterIndex: number) {

        paramRegistry.push({
            pathPart: value,
            target: target.constructor,
            propertyKey: propertyKey,
            parameterIndex: parameterIndex
        })
        console.log(`\t\tParameter Decorator called with value: ${value}`);
        console.log(`\t\tPTarget: ${target.constructor.name}`);
        console.log(`\t\tPProperty Key: ${propertyKey}`);
        console.log(`\t\tPParameter Index: ${parameterIndex}`);
    }
}


export function get(path: string = '') {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        getRegistry[path] = {
            propertyKey,
            handler: descriptor.value,
            target,
            params: []
        };
    }
}

export async function setupWebHandlers(app: S3App) {
    let appAsAny = <any> app;
    for(let registeredParam of paramRegistry){
        for(let key of Object.keys(getRegistry)){
            let entry = getRegistry[key];
            if(entry.target.constructor === registeredParam.target && entry.propertyKey === registeredParam.propertyKey) {
               entry.params.push({ pathPart: registeredParam.pathPart, parameterIndex: registeredParam.parameterIndex });                
            }
        }
    }


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
        apiRouter.get(path, async (req, res) => {            
            let params : any[] = [];            
            for(let param of entry.params){                
                let value = undefined;
                if(param.pathPart){
                    let key = param.pathPart.replace(':', '');
                    console.log('used key', key);
                    value = req.params[key];
                }
                params[param.parameterIndex] = parseInt(value);
            }
            console.log('calling ', owningObject.constructor.name, entry.propertyKey, 'with params', params);
            
            let result = entry.handler.apply(owningObject, params)
            if(result.then){
                result.then((r: any) => res.send(r));
            }else{
                res.send(result);
            }            
        });        
    }
    
    
    console.log(`Listening on port ${PORT}`);
    await listen(PORT);
}
