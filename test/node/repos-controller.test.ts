import { test, expect, beforeEach, afterAll } from 'vitest';
import { Db } from '../../src/main/db';
import { Database } from 'sqlite3';

import { FakeCanvasClient } from './fakes/FakeCanvasClient';
import { FakeGithubClient } from './fakes/FakeGithubClient';
import { FakeFileSystem } from './fakes/FakeFileSystem';
import { CourseConfig, CourseDTO } from '../../src/shared';
import { ReposController } from '../../src/main/repos-controller';

let db: Db = null;
let reposController: ReposController = null;
let canvasFake: FakeCanvasClient = null;
let githubFake: FakeGithubClient = null;
let fsFake: FakeFileSystem = null;

beforeEach(async () => {
    db = new Db(() => {
        let sqlite = new Database(':memory:');
        return sqlite;
    })

    await db.initSchema();
    canvasFake = new FakeCanvasClient();
    githubFake = new FakeGithubClient();
    fsFake = new FakeFileSystem();

    reposController = new ReposController(db, <any>canvasFake, <any>githubFake, <any>fsFake);
    
    await db.addCourse(someCourse);
    await db.updateSections(someCourse);
});

afterAll(async () => {
    await db.close();
});

const projectAssignmentName = 'bla-ass-p';
const verantwoordingAssignmentName = 'bla-ass-v';

const someCourse : CourseConfig & CourseDTO= {    
    canvasId: 123,
    canvasGroupsName: 'bla',    
    startDate: null,
    githubStudentOrg: 'bla-org',
    name: 'bla-course',    
    lastRepoCheck: null,
    lastSectionCheck: null,
    lastMappingCheck: null,
    assignments: [
        {
            githubAssignment: verantwoordingAssignmentName,
            canvasId: 456,
            groupAssignment: false
        },
        {
            githubAssignment: projectAssignmentName,
            groupAssignment: true
        }
    ],
    sections:{
        'bla-section': [
            {
                studentId: 123,
                email: 'test@example.com',
                name: 'test student',
                canvasId: 123
            }
        ]
    }
};

test("canLoadEmptyRepos", async () => {
    let result = await reposController.loadRepos(someCourse.canvasId, projectAssignmentName, { sections: [] })
    expect(result).toStrictEqual([]);
});


test("canLoadSoloRepos", async () => {
    canvasFake.mapping = { 'test@example.com': 'githubtest' }
    githubFake.repos = [
        {                       
            name: verantwoordingAssignmentName + '-githubtest',
            full_name: 'bla-org/' + verantwoordingAssignmentName + '-githubtest',
            organization: { login: 'bla-org' }
        }];

    let result = await reposController.loadRepos(someCourse.canvasId, verantwoordingAssignmentName, { sections: ['bla-section'] })
    expect(result.length).toBe(1);

});

function setupFakeGroupRepos() {
    canvasFake.mapping = { 'test@example.com': 'githubtest' }
    githubFake.repos = [
        {
            id: 42,
            name: projectAssignmentName + '-some-group',
            full_name: 'bla-org' + '/' + projectAssignmentName + '-some-group',
            organization: { login: 'bla-org' },
            html_url: 'https://example.org/bla'
        }];
    githubFake.members[projectAssignmentName + '-some-group'] = [{ login: 'githubtest' }];

}

test("canLoadGroupRepos", async () => {
    setupFakeGroupRepos();
    let result = await reposController.loadRepos(someCourse.canvasId, projectAssignmentName, { sections: ['bla-section'] })
    
    expect(result.length).toBe(1);

});

test("Second Time Loading Repos uses Cache", async () => {
    setupFakeGroupRepos();
    let firstResult = await reposController.loadRepos(someCourse.canvasId, projectAssignmentName, { sections: ['bla-section'] })
    let apiCalls = canvasFake.apiCalls + githubFake.apiCalls;
    let secondResult = await reposController.loadRepos(someCourse.canvasId, projectAssignmentName, { sections: ['bla-section'] })
    let secondApiCalls = canvasFake.apiCalls + githubFake.apiCalls;
    expect(secondApiCalls).toBe(apiCalls);
    expect(secondResult).toStrictEqual(firstResult)

});

test("canMultipleRepos", async () => {
    canvasFake.mapping = { 'test@example.com': 'user1' }
    githubFake.repos = [
        {
            id: 42, 
            name: projectAssignmentName + '-githubtest',
            full_name: 'bla-org/' + projectAssignmentName + '-githubtest',
            organization: { login: 'bla-org' }
        },
        {
            id: 43, 
            name: projectAssignmentName + '-githubtest2',
            full_name: 'bla-org/' + projectAssignmentName + '-githubtest2',
            organization: { login: 'bla-org' }
        }];
    githubFake.members[projectAssignmentName + '-githubtest'] = [{ login: 'user1' }];
    githubFake.members[projectAssignmentName + '-githubtest2'] = [{ login: 'user1' }];

    let result = await reposController.loadRepos(someCourse.canvasId, projectAssignmentName, { sections: ['bla-section'] })
    expect(result.length).toBe(2);
});

