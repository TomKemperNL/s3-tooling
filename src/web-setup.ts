import express from "express"
import { promisify } from "util";
import { S3App } from "./main/index";
import * as fspath from "path";
import passport from 'passport'
import session from 'express-session'
import createSessionStore from 'connect-sqlite3'

passport.serializeUser((user: any, done: any) => {
    done(null, user);
});

passport.deserializeUser((user: any, done: any) => {
    return done(null, user);
});


import { Strategy as GitHubStrategy } from 'passport-github2';


interface ExpressExtension {
    user?: { token: string, id: number, username: string };
    parsedParams?: { [key: string]: any };
    session: {
        returnUrl?: string;
    }
}

type ExtendedRequest = ExpressExtension & express.Request;

const expressApp = express();
const listen = promisify(expressApp.listen.bind(expressApp));

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
    const SQLiteStore: any = createSessionStore(session);
    
    passport.use(new GitHubStrategy({
        clientID: process.env.OAUTH_GITHUB_ID,
        clientSecret: process.env.OAUTH_GITHUB_SECRET,
        callbackURL: process.env.OAUTH_GITHUB_CALLBACK

      },
      function(accessToken: string, refreshToken: string, profile: any, done: any) {   
        return done(null, { token: accessToken, id: profile.id, username: profile.username});
      }
    ));

    expressApp.use('/assets', express.static('dist/src/web/assets'));
    expressApp.use('/favicon.ico', express.static('dist/src/web/static'));
    expressApp.use('/.well-known/*wtf', express.static('dist/src/web/static'));
    
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

    expressApp.get('/auth/github', (req: ExtendedRequest, res, next) => {
        req.session.returnUrl = <string>req.query.returnUrl || '';
        next();
    });
    expressApp.get('/auth/github', passport.authenticate('github', { scope: [ 'user:email' ] }));
    expressApp.get('/auth/github/callback', function(req: ExtendedRequest, res, next){
        passport.authenticate('github', { 
            successRedirect: '/' + (<string> req.session.returnUrl || ''),
            failureRedirect: '/login'
         })(req, res, next);
    }, function(req, res) {        
        res.redirect('/');
    });

    expressApp.get('/login', (req, res) => {    
        res.sendFile(fspath.resolve(process.cwd(), 'dist', 'src', 'web', 'web.html'));
    });

    expressApp.param('cid', (req: ExtendedRequest, res, next, cid) => {
        req.parsedParams = req.parsedParams || {};
        req.parsedParams['cid'] = parseInt(cid);
        next(); 
    });

    expressApp.param('assignment', (req: ExtendedRequest, res, next, assignment) => {
        req.parsedParams = req.parsedParams || {};
        req.parsedParams['assignment'] = assignment
        next(); 
    });

    expressApp.param('name', (req: ExtendedRequest, res, next, name) => {
        req.parsedParams = req.parsedParams || {};
        req.parsedParams['name'] = name;
        next(); 
    });    
    
    for(const path of Object.keys(getRegistry)) {
        expressApp.get(path, (req, res, next) => {
            next();
        });
        expressApp.get('/api' + path, (req, res, next) => {
            next();
        });
    }

    expressApp.use(async (req: ExtendedRequest, res, next) => {
        const requestedPathWithoutLeadingSlash = req.path.substring(1);
        // console.debug('Checking auth for ', req.path, req.parsedParams, req.user);
        if(req.user && req.parsedParams && await app.isAuthorized(req.user.username, req.session, {
            courseId: req.parsedParams['cid'] ? parseInt(req.parsedParams['cid']) : undefined,
            assignment: req.parsedParams['assignment'],
            repository: req.parsedParams['name'] //...
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

    const apiRouter = express.Router({ mergeParams: true });
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
