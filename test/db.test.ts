import { test, expect, beforeEach, afterAll } from 'vitest';
import { Db } from '../src/main/db'
import { Database } from "sqlite3";
import { CourseConfig, StudentDTO } from '../src/shared';

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
            githubAssignment: 'bla-ass-v',
            canvasId: 456,
            groupAssignment: false
        },
        {
            githubAssignment: 'bla-ass-p',
            groupAssignment: true
        }
    ]
};

const someStudents: StudentDTO[] = [
    { studentId: 1, name: 'Bob', email: 'Bob@example.com' }, { studentId: 2, name: 'Frob', email: 'Frob@example.com' },
]

test("can persist course", async () => {
    await db.addCourse(someCourse);
    let foundCourse = await db.getCourse(123);

    expect(foundCourse.name).toBe('bla-course');
    expect(foundCourse.assignments.length).toEqual(2);
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

test("can update authormapping", async () => {
    await db.addCourse(someCourse);
    // await db.updateRepoMapping(someCourse.canvasId, [ //eeeeuh waarom is dit niet nodig? Ik dacht dat ik een foreign key had gespecificeerd?
    //     { organization: { login: someCourse.githubStudentOrg}, name: "bla", lastMemberCheck: null, full_name: 'bla', html_url: '', ssh_url: '', url: '', private: false, created_at: '', updated_at: '' }
    // ])
    await db.updateAuthorMapping(someCourse.githubStudentOrg, "bla", {
        "Bob": "Bobster",
        "LautreBob": "Bobster",
        "Frob": "Frobbie"
    });

    await db.removeAliases(someCourse.githubStudentOrg, "bla", { "Bobster": ["LautreBob"] }); //L'autre Bob is toch een andere Bob

    let foundMappings = await db.getAuthorMapping(someCourse.githubStudentOrg, "bla");    
    
    expect(foundMappings["Bob"]).toBe("Bobster");
    expect(foundMappings["LautreBob"]).toBe(undefined);
    expect(foundMappings["Frob"]).toBe("Frobbie");

})