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
    await db.addCourse(someCourse);
    canvasFake = new FakeCanvasClient();
    canvasFake.sections = someSections;
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
    ],
    canvasOverview: [
        { assignments: [1,2], title: "TestA" },
        { assignments: [3], title: "TestB" },
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
    let result = await coursesController.getCourses();
    expect(result.length).toStrictEqual(1);
});

test("canLoadCourse", async () => {
    let result = await coursesController.loadCourse(someCourse.canvasId);
    expect(result.assignments.length).toBe(2);
    expect(result.sections).toStrictEqual({
        'bla-section': [{
            email: 'test@example.com',
            name: 'test student',
            studentId: 123456,
            canvasId: 123
        }]
    })
});

test("Second time loading course is cached", async () => {    
    await coursesController.loadCourse(someCourse.canvasId);
    let apiCalls = canvasFake.apiCalls;
    await coursesController.loadCourse(someCourse.canvasId);
    let nextApiCalls = canvasFake.apiCalls;
    expect(nextApiCalls).toBe(apiCalls);
});

test("Can get studentDetails", async () => {
    await coursesController.loadCourse(someCourse.canvasId);
    await db.updateUserMapping(someCourse.canvasId, {
        "test@example.com": "testGithub"
    });
    await db.updateAuthorMapping("bla-org", "someRepo", {
        "alias1": "testGithub",        
        "alias2": "otherGithub",
        "alias3": "testGithub",
    });
    await db.updateRepoMapping(someCourse.canvasId, [
        <any>{ name: "someRepo", organization: { login: "bla-org" }, full_name: "bla-org/someRepo" }
    ]);
    await db.updateCollaborators("bla-org", "someRepo", [
        { login: "testGithub" },
        { login: "missingUser" }
    ]); 

    let students = await coursesController.getStudents(someCourse.canvasId);
    console.log(students);
    expect(students.students.length).toBe(1);
    expect(students.students[0].identities["testGithub"]).toStrictEqual(["alias1", "alias3"]);
    expect(students.missing.length).toBe(2);
})


test("Can get Student Progress", async () => {
    await coursesController.loadCourse(someCourse.canvasId);
    canvasFake.assignments = [
        {
            id: 1,
            name: "Some Assignment 1",
            created_at: '',
            updated_at: '',
            due_at: '',
            locked_at: '',            
            rubrics: [
                {
                    id: 'rubric1',
                    points: 10,
                    description: 'Rubric Gedeeld',
                    long_description: 'Long description 1',
                    ratings: [
                        { points: 0, description: 'Poor', long_description: 'Did not meet expectations' },
                        { points: 5, description: 'Average', long_description: 'Met expectations' },
                        { points: 10, description: 'Excellent', long_description: 'Exceeded expectations' }
                    ]
                }
            ]
        },
        {
            id: 2,
            name: "Some Assignment 2",
            created_at: '',
            updated_at: '',
            due_at: '',
            locked_at: '',            
            rubrics: [
                {
                    id: 'rubric2',
                    points: 10,
                    description: 'Rubric Gedeeld',
                    long_description: 'Andere Long description 2',
                    ratings: [
                        { points: 0, description: 'Poor', long_description: 'Did not meet expectations' },
                        { points: 5, description: 'Average', long_description: 'Met expectations' },
                        { points: 7, description: 'Good', long_description: 'Met expectations, and then some' },
                        { points: 10, description: 'Excellent', long_description: 'Exceeded expectations' }
                    ]
                }
            ]
        },
        {
            id: 3,
            name: "Some Assignment 3",
            created_at: '',
            updated_at: '',
            due_at: '',
            locked_at: '',            
            rubrics: [
                {
                    id: 'rubric3',
                    points: 10,
                    description: 'Rubric 3',
                    long_description: 'Andere Long description 3',
                    ratings: [
                        { points: 0, description: 'Poor', long_description: 'Did not meet expectations' },
                        { points: 5, description: 'Average', long_description: 'Met expectations' },
                        { points: 10, description: 'Excellent', long_description: 'Exceeded expectations' }
                    ]
                }
            ]
        }        
    ]
    canvasFake.submissions = [
        {
            id: 1,
            user_id: 123,
            submitted_at: '2024-01-01T12:00:00Z',
            assignment_id: 1,
            rubric_assessment: {
                'rubric1': { points: 10, comments: 'Great job!' },
            },
            submission_comments: [{ id: 1, comment: 'Well done', author_id: 123, author_name: "Bob", created_at: '' }]
        },
        {
            id: 2,
            user_id: 123,
            submitted_at: '2024-01-01T12:00:00Z',
            assignment_id: 2,
            rubric_assessment: {
                'rubric2': { points: 8, comments: 'Great job!' },
            },
            submission_comments: []
        },
        {
            id: 3,
            user_id: 123,
            submitted_at: '2024-01-01T12:00:00Z',
            assignment_id: 3,
            rubric_assessment: {
                'rubric3': { points: 8, comments: 'Great job!' },
            },
            submission_comments: []
        },

    ]

    let progress = await coursesController.getStudentProgress(someCourse.canvasId, 123);
    expect(progress.overviews.length).toBe(2);
    expect(progress.overviews[0].title).toBe("TestA");
    expect(progress.overviews[1].title).toBe("TestB");

    expect(progress.overviews[0].criteria.length).toBe(1);
    expect(progress.overviews[0].criteria[0].description).toBe('Rubric Gedeeld');
    expect(progress.overviews[0].criteria[0].points).toBe(10);
    expect(progress.overviews[0].criteria[0].levels.length).toBe(4);
    expect(progress.overviews[0].criteria[0].results.length).toBe(2);
    expect(progress.overviews[0].criteria[0].results[0].assignmentName).toBe("Some Assignment 1");
    expect(progress.overviews[0].criteria[0].results[0].submitted_at).toBe('2024-01-01T12:00:00Z');
    expect(progress.overviews[0].criteria[0].results[0].points).toBe(10);
    expect(progress.overviews[0].criteria[0].results[1].assignmentName).toBe("Some Assignment 2");
    expect(progress.overviews[0].criteria[0].results[1].submitted_at).toBe('2024-01-01T12:00:00Z');
    expect(progress.overviews[0].criteria[0].results[1].points).toBe(8);
})