import { test, expect, beforeEach, afterAll } from 'vitest';
import { Db } from '../src/main/db'
import { Database } from "sqlite3";
import { CourseConfig, StudentDTO } from '../src/core';

let db: Db = null;
beforeEach(async () => {
    db = new Db(() => {
        let sqlite = new Database(':memory:');
        // sqlite.on('trace', console.debug);
        return sqlite;
    })

    await db.initSchema();
});

afterAll(async () => {
    await db.close();
});

const someCourse : CourseConfig = {
    canvasCourseId: 123,
    canvasGroupsName: 'bla',
    canvasVerantwoordingAssignmentId: 456,
    startDate: null,
    githubStudentOrg: 'bla-org',
    name: 'bla-course',
    projectAssignmentName: 'bla-ass-p',
    verantwoordingAssignmentName: 'bla-ass-v',
    lastRepoCheck: null,
    lastSectionCheck: null,
    lastMappingCheck: null
};

const someStudents: StudentDTO[] = [
    { studentId: 1, name: 'Bob', email: 'Bob@example.com' }, { studentId: 2, name: 'Frob', email: 'Frob@example.com' },
]

test("can persist course", async () => {
    await db.addCourse(someCourse);

    let foundCourse = await db.getCourse(123);

    expect(foundCourse.name).toBe('bla-course');
    expect(foundCourse.assignments).toEqual([
        { name: 'bla-ass-v', groupAssignment: false} ,{ name: 'bla-ass-p', groupAssignment: true }  
        ]);
});

test("can add sections to course", async () => {
    await db.addCourse(someCourse);
    let foundCourse = await db.getCourse(123);
    foundCourse.sections['abc'] = someStudents;
    await db.updateSections(foundCourse);
    let foundCourse2 = await db.getCourse(123);

    expect(foundCourse2.sections['abc']).not.toBeUndefined();
    expect(foundCourse2.sections['abc']).toEqual(someStudents);
});