import { test, expect, beforeEach } from 'vitest';
import { Db } from '../src/main/db'
import { Database } from "sqlite3";
import { StudentDTO } from '../src/core';

let db: Db = null;
beforeEach(async () => {
    db = new Db(() => {
        let sqlite = new Database(':memory:');
        // sqlite.on('trace', console.debug);
        return sqlite;
    })

    await db.initSchema();
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

const someStudents: StudentDTO[] = [
    { studentId: 1, name: 'Bob', email: 'Bob@example.com' }, { studentId: 2, name: 'Frob', email: 'Frob@example.com' },
]

test("can persist course", async () => {
    await db.addCourse(someCourse);

    let foundCourse = await db.getCourse(123);

    expect(foundCourse.name).toBe('bla-course');
    expect(foundCourse.assignments).toEqual(['bla-ass-p', 'bla-ass-v']);
});

test("can add sections to course", async () => {
    await db.addCourse(someCourse);
    let foundCourse = await db.getCourse(123);
    foundCourse.sections['abc'] = someStudents;
    await db.updateSections(foundCourse);
    console.log('querying')
    let foundCourse2 = await db.getCourse(123);

    console.log('found', foundCourse2)

    expect(foundCourse2.sections['abc']).not.toBeUndefined();
    expect(foundCourse2.sections['abc']).toEqual(someStudents);
});