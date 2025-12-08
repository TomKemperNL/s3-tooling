import { test, expect } from 'vitest';
import { CombinedStats } from '../../src/main/statistics';
import { RepositoryStatistics } from '../../src/main/repository-statistics';
import { ProjectStatistics } from '../../src/main/project-statistics';

test('Combined Statistics show both groups when exported even when no commits', () => {
    let repo1 = new RepositoryStatistics([]);
    let repo2 = new RepositoryStatistics([]);
    let combined = new CombinedStats([repo1, repo2]);

    let result = combined.groupBy([{
        name: 'Frontend',
        extensions: ['.js'],
    }, {
        name: 'Backend',
        extensions: ['.java'],
    }]).map(g => g.getLinesTotal()).export();
    expect(result).toStrictEqual({
        "Frontend": {
            "added": 0,
            "removed": 0
        },
        "Backend": {
            "added": 0,
            "removed": 0
        }
    });
});

test('Combined Statistics show both groups when exported even when no commits per week', () => {
    let repo1 = new RepositoryStatistics([
        {
            author: 'Alice', subject: 'Initial commit', date: new Date('2023-10-01'), hash: '1234567890abcdef', changes: [
                { added: 5, removed: 0, path: 'test.js' }
            ]
        }
    ]);
    let repo2 = new RepositoryStatistics([
        {
            author: 'Bob', subject: 'Initial commit', date: new Date('2023-10-08'), hash: 'abcdef1234567890', changes: [
                { added: 3, removed: 1, path: 'test.java' }
            ]
        }
    ]);
    let combined = new CombinedStats([repo1, repo2]);

    let result = combined
        .groupByWeek(new Date('2023-10-01'))
        .map(g => g.groupBy([{
            name: 'Frontend',
            extensions: ['.js'],
        }, {
            name: 'Backend',
            extensions: ['.java'],
        }]).map(g => g.getLinesTotal())).export();
    expect(result).toStrictEqual([{
        "Frontend": {
            "added": 5,
            "removed": 0
        },
        "Backend": {
            "added": 0,
            "removed": 0
        }
    }, {
        "Frontend": {
            "added": 0,
            "removed": 0
        },
        "Backend": {
            "added": 3,
            "removed": 1
        }
    }]);
});

test('Smoke-test: Can go back & forth between repositorytypes', () => {
    let repo1 = new RepositoryStatistics([
        {
            author: 'Alice', subject: 'Initial commit', date: new Date('2023-10-01'), hash: '1234567890abcdef', changes: [
                { added: 5, removed: 0, path: 'test.js' }
            ]
        }
    ]);
    let project1 = new ProjectStatistics([{
        author: 'Alice', body: 'Some issue', title: 'Issue 1', createdAt: new Date('2023-10-02'), comments: []
    }], []);
    let repo2 = new RepositoryStatistics([
        {
            author: 'Bob', subject: 'Initial commit', date: new Date('2023-10-08'), hash: 'abcdef1234567890', changes: [
                { added: 3, removed: 1, path: 'test.java' }
            ]
        }
    ]);

    let combined = new CombinedStats([new ProjectStatistics([], []), repo1, project1, repo2, new ProjectStatistics([], [])]);

    let result = combined
        .groupByWeek(new Date('2023-10-01'))
        .map(g => g.groupBy([{
            name: 'Frontend',
            extensions: ['.js'],
        }, {
            name: 'Backend',
            extensions: ['.java'],
        },
        {
            name: 'Communication',
            projectContent: ['issues', 'pullrequests'],
        }]).map(g => g.getLinesTotal())).export();

    expect(result).toStrictEqual([{
        "Frontend": {
            "added": 5,
            "removed": 0
        },
        "Backend": {
            "added": 0,
            "removed": 0
        },
        "Communication": {
            "added": 2,
            "removed": 0
        }
    }, {
        "Frontend": {
            "added": 0,
            "removed": 0
        },
        "Backend": {
            "added": 3,
            "removed": 1
        },
         "Communication": {
            "added": 0,
            "removed": 0
        }
    }]);
});