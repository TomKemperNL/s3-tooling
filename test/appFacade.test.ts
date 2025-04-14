import { test, expect, beforeEach, afterAll } from 'vitest';
import { Db } from '../src/main/db';
import { Database } from 'sqlite3';
import { AppFacade } from '../src/main/appFacade';
import { FakeCanvasClient } from './fakes/FakeCanvasClient';
import { FakeGithubClient } from './fakes/FakeGithubClient';
import { FakeFileSystem } from './fakes/FakeFileSystem';
import { CourseConfig } from '../src/core';

let db: Db = null;
let facade: AppFacade = null;
let canvasFake: FakeCanvasClient = null;
let githubFake: FakeGithubClient = null;
let fsFake : FakeFileSystem = null;

beforeEach(async () => {
    db = new Db(() => {
        let sqlite = new Database(':memory:');
        // sqlite.on('trace', console.debug);
        return sqlite;
    })

    await db.initSchema();
    canvasFake = new FakeCanvasClient();
    githubFake = new FakeGithubClient();
    fsFake = new FakeFileSystem();
    facade = new AppFacade(<any>githubFake, <any> canvasFake, <any>fsFake, db);
});

afterAll(async () => {
    await db.close();
});

const someCourse : CourseConfig = {
    canvasCourseId: 123,
    canvasGroupsName: 'bla',
    canvasVerantwoordingAssignmentId: 456,
    githubStudentOrg: 'bla-org',
    name: 'bla-course',
    projectAssignmentName: 'bla-ass-v',
    verantwoordingAssignmentName: 'bla-ass-p',
    lastRepoCheck: null,
    lastSectionCheck: null,
    lastMappingCheck: null
};

const someSections = [
    {
        course_id: someCourse.canvasCourseId,
        name: 'bla-section',
        id: 123,
        students: [{
            id: 123,
            login_id: 'test@example.com',
            name: 'test student',
            short_name: '...',
            sis_user_id: '123456',
            sortable_name: 'test student'
        }]
    }
];

test("canReceiveConfigs", async () => {
    db.addCourse(someCourse);
    let result = await facade.getConfigs();
    expect(result).toStrictEqual([someCourse]);
});

test("canLoadCourse", async () => {
    canvasFake.sections = someSections;

    await db.addCourse(someCourse);
    let result = await facade.loadCourse(someCourse.canvasCourseId);
    expect(result.assignments.length).toBe(2);
    expect(result.sections).toStrictEqual({
        'bla-section': [{             
            email: 'test@example.com',
            name: 'test student',
            studentId: 123456
        }]
    })
});

test("Second time loading course is cached", async () => {
    canvasFake.sections = someSections;

    await db.addCourse(someCourse);
    await facade.loadCourse(someCourse.canvasCourseId);
    let apiCalls = canvasFake.apiCalls + githubFake.apiCalls;
    await facade.loadCourse(someCourse.canvasCourseId);
    let nextApiCalls = canvasFake.apiCalls + githubFake.apiCalls;
    expect(nextApiCalls).toBe(apiCalls);    
});

test("canLoadEmptyRepos", async () => {
    await db.addCourse(someCourse);
    await facade.loadCourse(someCourse.canvasCourseId);

    let result = await facade.loadRepos(someCourse.canvasCourseId, someCourse.projectAssignmentName, { sections: []})
    expect(result).toStrictEqual([]);
});


test("canLoadSoloRepos", async () => {
    await db.addCourse(someCourse);
    canvasFake.sections = someSections;
    canvasFake.mapping = { 'test@example.com': 'githubtest' }
    githubFake.repos = [{ id: 42, name: someCourse.verantwoordingAssignmentName + '-githubtest'}];
    await facade.loadCourse(someCourse.canvasCourseId);

    let result = await facade.loadRepos(someCourse.canvasCourseId, someCourse.verantwoordingAssignmentName, { sections: ['bla-section']})
    expect(result.length).toBe(1);
    
});

test("canLoadGroupRepos", async () => {
    await db.addCourse(someCourse);
    canvasFake.sections = someSections;
    canvasFake.mapping = { 'test@example.com': 'githubtest' }
    githubFake.repos = [{ id: 42, name: someCourse.projectAssignmentName + '-some-group'}];
    githubFake.members[someCourse.projectAssignmentName + '-some-group'] = [{login: 'githubtest'}];
    await facade.loadCourse(someCourse.canvasCourseId);

    let result = await facade.loadRepos(someCourse.canvasCourseId, someCourse.projectAssignmentName, { sections: ['bla-section']})
    expect(result.length).toBe(1);
    
});

test("Second Time Loading Repos uses Cache", async () => {
    await db.addCourse(someCourse);
    canvasFake.sections = someSections;
    canvasFake.mapping = { 'test@example.com': 'githubtest' }
    githubFake.repos = [{ id: 42, name: someCourse.projectAssignmentName + '-some-group'}];
    githubFake.members[someCourse.projectAssignmentName + '-some-group'] = [{login: 'githubtest'}];
    await facade.loadCourse(someCourse.canvasCourseId);

    let firstResult = await facade.loadRepos(someCourse.canvasCourseId, someCourse.projectAssignmentName, { sections: ['bla-section']})
    let apiCalls = canvasFake.apiCalls + githubFake.apiCalls;
    let secondResult = await facade.loadRepos(someCourse.canvasCourseId, someCourse.projectAssignmentName, { sections: ['bla-section']})
    let secondApiCalls = canvasFake.apiCalls + githubFake.apiCalls;
    expect(secondApiCalls).toBe(apiCalls);
    expect(secondResult).toStrictEqual(firstResult)
    
});