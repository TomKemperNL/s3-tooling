import { test, expect, beforeEach, afterAll } from 'vitest';
import { Db } from '../../src/main/db';
import { Database } from 'sqlite3';

import { FakeCanvasClient } from './fakes/FakeCanvasClient';
import { FakeGithubClient } from './fakes/FakeGithubClient';
import { FakeFileSystem } from './fakes/FakeFileSystem';
import { CourseConfig } from '../../src/shared';
import { CoursesController } from '../../src/main/courses-controller';

let db: Db = null;
let coursesController: CoursesController = null;
let canvasFake: FakeCanvasClient = null;

beforeEach(async () => {
    db = new Db(() => {
        let sqlite = new Database(':memory:');
        // sqlite.on('trace', console.debug);
        return sqlite;
    })

    await db.initSchema();
    canvasFake = new FakeCanvasClient();
    coursesController = new CoursesController(db, <any>canvasFake);
});

afterAll(async () => {
    await db.close();
});

const projectAssignmentName = 'bla-ass-p';
const verantwoordingAssignmentName = 'bla-ass-v';

const someCourse : CourseConfig = {    
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
    ]
};

const someSections = [
    {
        course_id: someCourse.canvasId,
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
    await db.addCourse(someCourse);
    let result = await coursesController.getCourses();
    expect(result.length).toStrictEqual(1);
});

test("canLoadCourse", async () => {
    canvasFake.sections = someSections;

    await db.addCourse(someCourse);
    let result = await coursesController.loadCourse(someCourse.canvasId);
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
    await coursesController.loadCourse(someCourse.canvasId);
    let apiCalls = canvasFake.apiCalls;
    await coursesController.loadCourse(someCourse.canvasId);
    let nextApiCalls = canvasFake.apiCalls;
    expect(nextApiCalls).toBe(apiCalls);
});