import { test, expect, beforeEach, afterAll } from 'vitest';
import { Db } from '../../src/main/db';
import { Database } from 'sqlite3';

import { FakeCanvasClient } from './fakes/FakeCanvasClient';
import { FakeGithubClient } from './fakes/FakeGithubClient';
import { FakeFileSystem } from './fakes/FakeFileSystem';
import { CourseConfig } from '../../src/shared';
import { StatisticsController } from '../../src/main/statistics-controller';
import { FakeReposController } from './fakes/FakeReposController';
import { FakeCoursesController } from './fakes/FakeCoursesController';

let db: Db = null;
let statisticsController: StatisticsController = null;
let githubFake: FakeGithubClient = null;
let fsFake: FakeFileSystem = null;
let reposFake: FakeReposController = null;
let coursesFake: FakeCoursesController = null;

beforeEach(async () => {
  db = new Db(() => {
    let sqlite = new Database(':memory:');
    return sqlite;
  })

  await db.initSchema();
  githubFake = new FakeGithubClient();
  fsFake = new FakeFileSystem();
  reposFake = new FakeReposController();
  coursesFake = new FakeCoursesController();
  statisticsController = new StatisticsController(db, <any>githubFake, <any>fsFake, <any>reposFake, <any>coursesFake);

  await db.addCourse(someCourse);
});

afterAll(async () => {
  await db.close();
});

const projectAssignmentName = 'bla-ass-p';
const otherAssignmentName = 'bla-ass-o'
const someCourse: CourseConfig = {
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
      name: projectAssignmentName,
      groupAssignment: true
    },
    {
      name: otherAssignmentName,
      groupAssignment: false
    }
  ]
};

test("canGetEmptyStats", async () => {
  let result = await statisticsController.getRepoStats(
    someCourse.canvasId, projectAssignmentName, "someRepo")
  expect(result).toStrictEqual({
    "aliases": {},
    "authors": [],
    "groups": ["Backend", "Frontend", "Markup", "Docs", "Communication", "Other"],
    "week_group_author": [{
      "Backend": {},
      "Frontend": {},
      "Markup": {},
      "Docs": {},
      "Communication": {},
      "Other": {}
    }]
  });
});


test("Can Get Merged Stats", async () => {
  fsFake.commits = [
    {
      author: "Bob", hash: "ABCD1234", subject: "Feature X", date: new Date('2023-10-01'),
      changes: [
        { added: 10, removed: 2, path: "file1.js" },
      ]
    }
  ];
  githubFake.pullRequests = [
    { author: "Bob", body: "Hai", title: "Test", comments: [], createdAt: new Date('2023-10-01') }
  ];
  githubFake.issues = [
    { author: "Bob", body: "Hai", title: "Test", comments: [], createdAt: new Date('2023-10-01') }
  ];

  let result = await statisticsController.getRepoStats(
    someCourse.canvasId, projectAssignmentName, "someRepo");
  expect(result).toStrictEqual(
    {
      "aliases": {},
      "authors": ["Bob"],
      "groups": ["Backend", "Frontend", "Markup", "Docs", "Communication", "Other"],
      "week_group_author": [{
        "Backend": { "Bob": { added: 0, removed: 0 } },
        "Frontend": { "Bob": { added: 10, removed: 2 } },
        "Markup": { "Bob": { added: 0, removed: 0 } },
        "Docs": { "Bob": { added: 0, removed: 0 } },
        "Communication": { "Bob": { added: 4, removed: 0 } },
        "Other": { "Bob": { added: 0, removed: 0 } }
      }]
    }
  );
});



test("Can Get Merged Group-Pie", async () => {
  fsFake.blame = {
    "Backend": {
      "Bob": 10
    }
  }
  githubFake.pullRequests = [
    { author: "Bob", body: "Hai", title: "Test", comments: [], createdAt: new Date('2023-10-01') }
  ];
  githubFake.issues = [
    { author: "Bob", body: "Hai", title: "Test", comments: [], createdAt: new Date('2023-10-01') }
  ];

  let result = await statisticsController.getGroupPie(
    someCourse.canvasId, projectAssignmentName, "someRepo");
  expect(result).toStrictEqual(
    {
      "aliases": {},
      "groupedPie": {
        "Backend": { "Bob": 10 },
        "Communication": { "Bob": 4 }
      }
    }
  );
});


test("Can Filter Authors", async () => {
  fsFake.blame = {
    "Backend": {
      "Bob": 10,
      "Fred": 33
    }
  }
  githubFake.pullRequests = [
    { author: "Bob", body: "Hai", title: "Test", comments: [], createdAt: new Date('2023-10-01') }
  ];
  githubFake.issues = [
    { author: "Bob", body: "Hai", title: "Test", comments: [], createdAt: new Date('2023-10-01') }
  ];

  let result = await statisticsController.getGroupPie(
    someCourse.canvasId, projectAssignmentName, "someRepo", { authors: ["Bob"] });
  expect(result.groupedPie["Backend"]["Fred"]).toBe(undefined);
});




test("Can Get Student Stats", async () => {

  await db.updateRepoMapping(someCourse.canvasId, [
    <any>{ name: "bla-ass-p-groupx", full_name: 'bla-org/bla-ass-p-groupx' },
    <any>{ name: "bla-ass-o-Bob", full_name: 'bla-org/bla-ass-o-Bob' },
  ])
  await db.updateCollaborators('bla-org', 'bla-ass-p-groupx', [{ login: 'Bob' }])
  await db.updateCollaborators('bla-org', 'bla-ass-o-Bob', [{ login: 'Bob' }])
  fsFake.blame = {
    "Backend": {
      "Bob": 10
    }
  }

  //Hier gaat de fake een beetje mis, want hij returnt dezelfde dingen voor elke repo, vandaar dat de assert gewoon alles verdubbelt voor lines of code
  fsFake.commits = [
    {
      author: "Bob", hash: "ABCD1234", subject: "Feature X", date: new Date('2023-10-01'),
      changes: [
        { added: 10, removed: 2, path: "file1.js" },
      ]
    }
  ];

  githubFake.pullRequests = [
    { author: "Bob", body: "Hai", title: "Test", comments: [], createdAt: new Date('2023-10-01') }
  ];
  githubFake.issues = [
    { author: "Bob", body: "Hai", title: "Test", comments: [], createdAt: new Date('2023-10-01') }
  ];

  let result = await statisticsController.getStudentStats(
    someCourse.canvasId, "Bob");
  
  //We hebben nog de hack dat we voor individuele repos geen coms uitvragen
  expect(result.groupedPie).toStrictEqual(
    {
      "Backend": {
        "Bob": 20,
      },
      "Communication": {
        "Bob": 4,
      }
    }
  );

  expect(result.week_group[0]["Frontend"]).toStrictEqual({ added: 20, removed: 4 });
  expect(result.week_group[0]["Communication"]).toStrictEqual({ added: 4, removed: 0}); 
    
});