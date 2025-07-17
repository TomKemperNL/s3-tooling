import { test, expect } from 'vitest';
import { CombinedStats } from '../src/main/statistics';
import { RepositoryStatistics } from '../src/main/repository-statistics';

test('Combined Statistics show both groups when exported even when no commits', () => {
    let repo1 = new RepositoryStatistics([{
        name: 'Frontend',
        extensions: ['.js'],
    }], []);
    let repo2 = new RepositoryStatistics([{
        name: 'Backend',
        extensions: ['.java'],
    }], []);
    let combined = new CombinedStats([repo1, repo2]);

    let result = combined.groupBySubject().map(g => g.getLinesTotal()).export();
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
    let repo1 = new RepositoryStatistics([{
        name: 'Frontend',
        extensions: ['.js'],
    }], [
        {
            author: 'Alice', subject: 'Initial commit', date: new Date('2023-10-01'), hash: '1234567890abcdef', changes: [
                { added: 5, removed: 0, path: 'test.js' }
            ]
        }
    ]);
    let repo2 = new RepositoryStatistics([{
        name: 'Backend',
        extensions: ['.java'],
    }], [
        {
            author: 'Bob', subject: 'Initial commit', date: new Date('2023-10-08'), hash: 'abcdef1234567890', changes: [
                { added: 3, removed: 1, path: 'test.java' }
            ]
        }
    ]);
    let combined = new CombinedStats([repo1, repo2]);

    let result = combined
        .groupByWeek(new Date('2023-10-01'))
        .map(g => g.groupBySubject().map(g => g.getLinesTotal())).export();
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