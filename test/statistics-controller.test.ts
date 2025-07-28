import { test, expect, beforeEach, afterAll } from 'vitest';
import { Db } from '../src/main/db';
import { Database } from 'sqlite3';

import { FakeCanvasClient } from './fakes/FakeCanvasClient';
import { FakeGithubClient } from './fakes/FakeGithubClient';
import { FakeFileSystem } from './fakes/FakeFileSystem';
import { CourseConfig } from '../src/shared';
import { StatisticsController } from '../src/main/statistics-controller';
import { FakeReposController } from './fakes/FakeReposController';

let db: Db = null;
let statisticsController: StatisticsController = null;
let githubFake: FakeGithubClient = null;
let fsFake: FakeFileSystem = null;
let reposFake: FakeReposController = null;

beforeEach(async () => {
  db = new Db(() => {
    let sqlite = new Database(':memory:');
    return sqlite;
  })

  await db.initSchema();
  githubFake = new FakeGithubClient();
  fsFake = new FakeFileSystem();
  reposFake = new FakeReposController();
  statisticsController = new StatisticsController(db, <any>githubFake, <any>fsFake, <any>reposFake);

  await db.addCourse(someCourse);
});

afterAll(async () => {
  await db.close();
});

const projectAssignmentName = 'bla-ass-p';
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
      githubAssignment: projectAssignmentName,
      groupAssignment: true
    }
  ]
};

test("canGetEmptyStats", async () => {
  let result = await statisticsController.getRepoStats(
    someCourse.canvasId, projectAssignmentName, "someRepo", { filterString: "" })
  expect(result).toStrictEqual({
    "aliases": {},
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
    someCourse.canvasId, projectAssignmentName, "someRepo", { filterString: "" });
  expect(result).toStrictEqual(
    {
      "aliases": {},
      "authors": {
        "Bob": {
          "added": 14,
          "removed": 2,
        },
      },
      "total": {
        "added": 14,
        "removed": 2,
      },
      "weekly": {
        "authors": {
          "Bob": [
            {
              "added": 14,
              "removed": 2,
            },
          ],
        },
        "total": [
          {
            "added": 14,
            "removed": 2,
          },
        ],
      },
    }
  );

});

test("Can Get User Stats with only Commits", async () => {
  fsFake.commits = [
    {
      author: "Bob", hash: "ABCD1234", subject: "Feature X", date: new Date('2023-10-01'),
      changes: [
        { added: 10, removed: 2, path: "file1.js" },
      ]
    }
  ];

  let result = await statisticsController.getStudentStats(
  someCourse.canvasId, projectAssignmentName, "someRepo", { authorName: "Bob" });
  
  expect(result).toStrictEqual(
    {
      "aliases": {},
      "total": {
        "Backend": {
          "added": 0,
          "removed": 0
        },
        "Frontend": {
          "added": 10,
          "removed": 2
        },
        "Markup": {
          "added": 0,
          "removed": 0
        },
        "Docs": {
          "added": 0,
          "removed": 0
        },
        "Communication": {
          "added": 0,
          "removed": 0
        }
      },
      "weekly": [
        {
          "Backend": {
            "added": 0,
            "removed": 0
          },
          "Frontend": {
            "added": 10,
            "removed": 2
          },
          "Markup": {
            "added": 0,
            "removed": 0
          },
          "Docs": {
            "added": 0,
            "removed": 0
          },
          "Communication": {
            "added": 0,
            "removed": 0
          }
        }
      ]
    }
  );

});


test("Can Get User Stats with only Project-stuff", async () => {
  
  githubFake.pullRequests = [
    { author: "Bob", body: "Hai", title: "Test", comments: [], createdAt: new Date('2023-10-01') }
  ];
  githubFake.issues = [
    { author: "Bob", body: "Hai", title: "Test", comments: [], createdAt: new Date('2023-10-01') }
  ];

  let result = await statisticsController.getStudentStats(
  someCourse.canvasId, projectAssignmentName, "someRepo", { authorName: "Bob" });
  expect(result).toStrictEqual(
    {
      "aliases": {},
      "total": {
        "Backend": {
          "added": 0,
          "removed": 0
        },
        "Frontend": {
          "added": 0,
          "removed": 0
        },
        "Markup": {
          "added": 0,
          "removed": 0
        },
        "Docs": {
          "added": 0,
          "removed": 0
        },
        "Communication": {
          "added": 4,
          "removed": 0
        }
      },
      "weekly": [
        {
          "Backend": {
            "added": 0,
            "removed": 0
          },
          "Frontend": {
            "added": 0,
            "removed": 0
          },
          "Markup": {
            "added": 0,
            "removed": 0
          },
          "Docs": {
            "added": 0,
            "removed": 0
          },
          "Communication": {
            "added": 4,
            "removed": 0
          }
        }
      ]
    }
  );

});