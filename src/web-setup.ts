import express from "express"
import { promisify } from "util";
import { S3App } from "./main/index";
import * as fspath from "path";
const passport = require('passport');
passport.serializeUser((user: any, done: any) => {
    done(null, user);
});

passport.deserializeUser((user: any, done: any) => {
    return done(null, user);
});


import { Strategy as GitHubStrategy } from 'passport-github2';


const expressApp = express();
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
        });
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
        return done(null, { token: accessToken, id: profile.id, username: profile.username});
      }
    ));

    const apiRouter = express.Router();

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

    expressApp.get('/auth/github', (req, res, next) => {
        (<any>req).session.returnUrl = req.query.returnUrl || '';
        next();
    });
    expressApp.get('/auth/github', passport.authenticate('github', { scope: [ 'user:email' ] }));
    expressApp.get('/auth/github/callback', function(req, res, next){
        passport.authenticate('github', { 
            successRedirect: '/' + ((<any>req).session.returnUrl || ''),
            failureRedirect: '/login'
         })(req, res, next);
    }, function(req, res) {        
        res.redirect('/');
    });

    expressApp.get('/login', (req, res) => {    
        res.sendFile(fspath.resolve(process.cwd(), 'dist', 'src', 'web', 'web.html'));
    });

    expressApp.param('cid', (req, res, next, cid) => {
        req.parsedParams = req.parsedParams || {};
        req.params['cid'] = parseInt(cid);
        next(); 
    });
    
    expressApp.get('/stats/:cid/:assignment/:name', (req, res, next) => { 
        console.log('lalalaaa3', req.params);        
        next() })

    for(const path of Object.keys(getRegistry)) {
        const fullPath = '/api' + path;
        console.log('setting up parser for '  + fullPath)
        expressApp.get(fullPath, (req, res, next) => {   
            console.log('lalalalaaaa', req.params);
            next();
        });
        expressApp.get(path, (req, res, next) => {   
            console.log('lalalalaaaa2', req.params);
            next();
        });
    }


    expressApp.use(async (req, res, next) => {
        const requestedPathWithoutLeadingSlash = req.path.substring(1);
        if(req.user && await app.isAuthorized((<any>req.user).username, (<any>req).session, {
            courseId: req.params['cid'] ? parseInt(req.params['cid']) : undefined,
            assignment: req.params['assignment'],
            repository: req.params['name'] //...
        })){
            next();
        }else if(req.user){
            if(req.accepts('html')){
                res.redirect('/login?returnUrl=' + requestedPathWithoutLeadingSlash);            
            }else{
                res.status(403).send('You are not authorized to access this resource');
            }
        }else{
            if(req.accepts('html')){
                res.redirect('/login?returnUrl=' + requestedPathWithoutLeadingSlash);
            }else{
                res.status(401).send('You must log in to access this resource');
            }            
        }
    });

    expressApp.use('/api', apiRouter);
    expressApp.get('{/*spa}', (req, res) => {    
        res.sendFile(fspath.resolve(process.cwd(), 'dist', 'src', 'web', 'web.html'));
    });

    const appAsAny = <any> app;
    for(const registeredParam of paramRegistry){
        for(const key of Object.keys(getRegistry)){
            const entry = getRegistry[key];
            if(entry.target.constructor === registeredParam.target && entry.propertyKey === registeredParam.propertyKey) {
               entry.params.push({ pathPart: registeredParam.pathPart, parameterIndex: registeredParam.parameterIndex });                
            }
        }
    }


    console.log('Setting up web handlers for ', Object.keys(getRegistry));
    
    for(const path of Object.keys(getRegistry)) {
        const entry = getRegistry[path];
        let owningObject = app;
        
        for(const key of Object.keys(app)){
            if(entry.target.constructor === appAsAny[key].constructor){
                owningObject = appAsAny[key];
                break;
            }
        }
        console.log('Adding GET for ', path);
        apiRouter.get(path, async (req, res) => {            
            const params : any[] = [];            
            for(const param of entry.params){                
                let value = undefined;
                if(param.pathPart){
                    const key = param.pathPart.replace(':', '');
                    value = req.params[key];
                }
                if(/^\d+$/.test(value)){
                    params[param.parameterIndex] = parseInt(value);
                }else{
                    params[param.parameterIndex] = value;
                }
                
            }
            console.log('calling ', owningObject.constructor.name, entry.propertyKey, 'with params', params);
            
            try{
                let result = entry.handler.apply(owningObject, params);
                if(result.then){
                    result = await result;
                }
                
                res.send(result);
            }catch(e){
                console.error('Error in ', owningObject.constructor.name, entry.propertyKey, 'with args:', params, ':', e);                
            }
        });        
    }
    
    
    console.log(`Listening on port ${PORT}`);
    await listen(PORT);
}
