import { test, expect, beforeEach, afterAll } from 'vitest';
import { Db } from '../src/main/db';
import { Database } from 'sqlite3';
import { AppFacade } from '../src/main/appFacade';
import { FakeCanvasClient } from './fakes/FakeCanvasClient';
import { FakeGithubClient } from './fakes/FakeGithubClient';

let db: Db = null;
let facade: AppFacade = null;
let canvasFake: FakeCanvasClient = null;
let githubFake: FakeGithubClient = null;

beforeEach(async () => {
    db = new Db(() => {
        let sqlite = new Database(':memory:');
        // sqlite.on('trace', console.debug);
        return sqlite;
    })

    await db.initSchema();
    canvasFake = new FakeCanvasClient();
    githubFake = new FakeGithubClient();
    facade = new AppFacade(<any>githubFake, <any> canvasFake, null, db);
});

afterAll(async () => {
    await db.close();
});

const someCourse = {
    canvasCourseId: 123,
    canvasGroupsName: 'bla',
    canvasVerantwoordingAssignmentId: 456,
    githubStudentOrg: 'bla-org',
    name: 'bla-course',
    projectAssignmentName: 'bla-ass-v',
    verantwoordingAssignmentName: 'bla-ass-p'
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
    githubFake.repos = [{ name: someCourse.verantwoordingAssignmentName + '-githubtest'}];
    await facade.loadCourse(someCourse.canvasCourseId);

    let result = await facade.loadRepos(someCourse.canvasCourseId, someCourse.verantwoordingAssignmentName, { sections: ['bla-section']})
    // expect(result.length).toBe(1);
    
});

test("canLoadGroupRepos", async () => {
   
    
});