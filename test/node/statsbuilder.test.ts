import { test, expect } from 'vitest';
import { RepositoryStatistics } from '../../src/main/repository-statistics';
import { StatsBuilder } from '../../src/main/statistics';

test('StatsBuilder - 1 doors down', async () => {
    let repoStats = new RepositoryStatistics([
        {
            author: 'Bob',
            subject: 'Added some stuff',
            date: new Date(Date.parse("2023-10-01T12:00:00Z")),
            hash: '1234567890abcdef',
            changes: [
                { added: '-', removed: '-', path: 'test.png' },
                { added: 1, removed: 2, path: 'test.java' },
                { added: 3, removed: 4, path: 'test2.js' }
            ]
        },
        {
            author: 'Fred',
            subject: 'Added some stuff',
            date: new Date(Date.parse("2023-10-09T12:00:00Z")),
            hash: '1234567890abcdef',
            changes: [
                { added: 3, removed: 4, path: 'test2.js' }
            ]
        }
    ]);


    const statsBuilder = new StatsBuilder(repoStats);
    let range = repoStats.getDateRange()
    let result = statsBuilder.groupByWeek(range.start, range.end).build();


    expect(result).toStrictEqual([ { added: 4, removed: 6 }, { added: 3, removed: 4 } ]);
    
});


test('StatsBuilder - 2 doors down', async () => {
    let repoStats = new RepositoryStatistics([
        {
            author: 'Bob',
            subject: 'Added some stuff',
            date: new Date(Date.parse("2023-10-01T12:00:00Z")),
            hash: '1234567890abcdef',
            changes: [
                { added: '-', removed: '-', path: 'test.png' },
                { added: 1, removed: 2, path: 'test.java' },
                { added: 3, removed: 4, path: 'test2.js' }
            ]
        },
        {
            author: 'Fred',
            subject: 'Added some stuff',
            date: new Date(Date.parse("2023-10-09T12:00:00Z")),
            hash: '1234567890abcdef',
            changes: [
                { added: 3, removed: 4, path: 'test2.js' }
            ]
        }
    ]);


    const statsBuilder = new StatsBuilder(repoStats);
    let range = repoStats.getDateRange()
    let result = statsBuilder.groupByWeek(range.start, range.end).thenBy([
        { name: 'frontend', extensions: ['java'] },
        { name: 'backend', extensions: ['js'] },        
    ]).build();


    expect(result).toStrictEqual([
        {
          frontend: { added: 1, removed: 2 },
          backend: { added: 3, removed: 4 }
        },
        {
          frontend: { added: 0, removed: 0 },
          backend: { added: 3, removed: 4 }
        }
      ]
    )
    // console.log(result)
    
});

test('StatsBuilder - 3 doors down', async () => {
    let repoStats = new RepositoryStatistics([
        {
            author: 'Bob',
            subject: 'Added some stuff',
            date: new Date(Date.parse("2023-10-01T12:00:00Z")),
            hash: '1234567890abcdef',
            changes: [
                { added: '-', removed: '-', path: 'test.png' },
                { added: 1, removed: 2, path: 'test.java' },
                { added: 3, removed: 4, path: 'test2.js' }
            ]
        },
        {
            author: 'Fred',
            subject: 'Added some stuff',
            date: new Date(Date.parse("2023-10-09T12:00:00Z")),
            hash: '1234567890abcdef',
            changes: [
                { added: 3, removed: 4, path: 'test2.js' }
            ]
        }
    ]);

    const statsBuilder = new StatsBuilder(repoStats);
    let range = repoStats.getDateRange()
    let result = statsBuilder.groupByWeek(range.start, range.end).thenBy([
        { name: 'frontend', extensions: ['java'] },
        { name: 'backend', extensions: ['js'] },        
    ]).thenByAuthor(["Bob", "Fred"]).build();

    expect(result).toStrictEqual([{
        frontend: { Bob: { added: 1, removed: 2 }, Fred: { added: 0, removed: 0 } },
        backend: { Bob: { added: 3, removed: 4 }, Fred: { added: 0, removed: 0 } }
      },
      {
        frontend: { Bob: { added: 0, removed: 0 }, Fred: { added: 0, removed: 0 } },
        backend: { Fred: { added: 3, removed: 4 }, Bob: { added: 0, removed: 0 } }
      }]);    
});