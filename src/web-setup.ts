import express from "express"
import { promisify } from "util";
import { S3App } from "./main/index";
import * as fspath from "path";
var passport = require('passport');
passport.serializeUser((user: any, done: any) => {
    done(null, user);
});

passport.deserializeUser((user: any, done: any) => {
    return done(null, user);
});


import { Strategy as GitHubStrategy } from 'passport-github2';


let expressApp = express();
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
    
    const session: any = require('express-session');
    const SQLiteStore: any = require('connect-sqlite3')(session);
    
    passport.use(new GitHubStrategy({
        clientID: process.env.OAUTH_GITHUB_ID,
        clientSecret: process.env.OAUTH_GITHUB_SECRET,
        callbackURL: process.env.OAUTH_GITHUB_CALLBACK

      },
      function(accessToken: string, refreshToken: string, profile: any, done: any) {
        console.log('GitHub profile received:', profile);
        
        return done(null, { token: accessToken, id: profile.id, username: profile.username});
      }
    ));

    let apiRouter = express.Router();

    expressApp.use('/assets', express.static('dist/src/web/assets'));
    
    expressApp.use(session({
        store: new SQLiteStore({ db: 'sessions.sqlite3' }),
        secret: 's3-tooling-secret??',
        cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
    }));
    expressApp.use(passport.session());
    expressApp.get('/auth/session', (req, res) => {
        res.send({
            user: req.user || null,
        });
    });
    expressApp.delete('/auth/session', (req, res) => {
        req.logout((err: any) => {
            if (err) {
                return res.status(500).send('Logout failed');
            }
            res.sendStatus(201);
        });
    });
    expressApp.get('/auth/github', passport.authenticate('github', { scope: [ 'user:email' ] }));      
    expressApp.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/login' }), function(req, res) {        
        res.redirect('/');
    });

    expressApp.use('/api', apiRouter);
    expressApp.get('{/*spa}', (req, res) => {    
        res.sendFile(fspath.resolve(process.cwd(), 'dist', 'src', 'web', 'web.html'));
    });

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
                if(/^\d+$/.test(value)){
                    params[param.parameterIndex] = parseInt(value);
                }else{
                    params[param.parameterIndex] = value;
                }
                
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
