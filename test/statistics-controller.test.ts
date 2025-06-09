import { test, expect, beforeEach, afterAll } from 'vitest';
import { Db } from '../src/main/db';
import { Database } from 'sqlite3';

import { FakeCanvasClient } from './fakes/FakeCanvasClient';
import { FakeGithubClient } from './fakes/FakeGithubClient';
import { FakeFileSystem } from './fakes/FakeFileSystem';
import { CourseConfig } from '../src/shared';
import { StatisticsController } from '../src/main/statistics-controller';

let db: Db = null;
let statisticsController: StatisticsController = null;
let githubFake: FakeGithubClient = null;
let fsFake: FakeFileSystem = null;

beforeEach(async () => {
    db = new Db(() => {
        let sqlite = new Database(':memory:');
        return sqlite;
    })

    await db.initSchema();
    githubFake = new FakeGithubClient();
    fsFake = new FakeFileSystem();

    statisticsController = new StatisticsController(db, <any>githubFake, <any>fsFake);
    
    await db.addCourse(someCourse);
});

afterAll(async () => {
    await db.close();
});

const projectAssignmentName = 'bla-ass-p';
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
            githubAssignment: projectAssignmentName,
            groupAssignment: true
        }
    ]
};

test("canGetEmptyStats", async () => {
    let result = await statisticsController.getRepoStats(
        someCourse.canvasId, projectAssignmentName, "someRepo", {filterString: ""})
    expect(result).toStrictEqual({
        "authors": {},
        "total": {
          "added": 0,
          "removed": 0,
        },
        "weekly": {
          "authors": {},
          "total": [
            {
              "added": 0,
              "removed": 0,
            },
          ],
        },
      });
});
