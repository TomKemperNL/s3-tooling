import { test, expect } from 'vitest';
import { ProjectStatistics } from '../src/main/project-statistics';
import { Issue, PullRequest } from '../src/shared';
import { ExportingArray, GroupedCollection } from '../src/main/statistics';


test('CanSumLinesPerAuthor', {}, () => {
    let stats = new ProjectStatistics("Communication", [
        {
            author: 'Bob@Home',
            title: 'Some stuff is broken',
            body: 'This is a test issue',
            createdAt: new Date(),
            comments: [
            ]
        }
    ], [{
        author: 'Fred',
        title: 'This should be implemented',
        body: 'This is a test request.\nWith a new line',
        createdAt: new Date(),
        comments: [
            {
                author: 'Bob2',
                body: "I want it now!\nAnd it better be good.",
                createdAt: new Date()
            }
        ]
    }]);

    stats.mapAuthors({
        'Bob@Home': 'Bob',
        'Bob2': 'Bob'       
    });

    let results = stats.groupByAuthor().map(s => s.getLinesTotal()).export();

    expect(results["Fred"].added).toBe(3); //1 title, +2 body
    expect(results["Bob"].added).toBe(4); //1 title, +1 body + 2 comments
});

test('Can Group ProjectItems Per Week', {}, () => {
    let someIssueOrPr: any = {
        title: 'Some stuff is broken',
        body: 'This is a test',
        author: 'Bob',
        comments: []
    }

    let stats = new ProjectStatistics("Communication", [
        { createdAt: new Date('2023-10-01'), ...someIssueOrPr },
        { createdAt: new Date('2023-10-02'), ...someIssueOrPr },
        { createdAt: new Date('2023-10-08'), ...someIssueOrPr },
        { createdAt: new Date('2023-10-25'), ...someIssueOrPr },
    ].reverse(), [], []);

    let result = stats.groupByWeek().map((w) => w.getLinesTotal()).export();
    expect(result[0].added, 'Can read multiple issues in 1 week').toBe(4);
    expect(result[1].added, 'Can go to next week').toBe(2);
    expect(result[2].added, 'Can skip an empty week').toBe(0);
    expect(result[3].added).toBe(2);
    expect(result[4]).toBe(undefined);
});

test('Can Group ProjectItems Per Week with an empty week after', {}, () => {
    let someIssueOrPr: any = {
        title: 'Some stuff is broken',
        body: 'This is a test',
        author: 'Bob',
        comments: []
    }

    let stats = new ProjectStatistics("Communication", [
        { createdAt: new Date('2023-10-01'), ...someIssueOrPr }
    ].reverse(), [], []);

    let result = stats.groupByWeek(new Date('2023-10-01'), new Date('2023-10-08')).map((w) => w.getLinesTotal()).export();
    expect(result.length).toBe(2);
    expect(result[0].added).toBe(2);
    expect(result[1].added).toBe(0);
})

test('Can combine stat groups', () => {
    let someStuff = new GroupedCollection({
        'Bob': { added: 1, removed: 2 },
        'Fred': { added: 3, removed: 4 }
    });

    let someOtherStuff = new GroupedCollection({
        'Bob': { added: 1, removed: 2 },
        'Anny': { added: 2, removed: 3 }
    });

    let result = someStuff.combine(someOtherStuff, (a, b) => ({
        added: a.added + b.added,
        removed: a.removed + b.removed
    })).export();

    expect(result['Bob'].added).toBe(2);
    expect(result['Bob'].removed).toBe(4);
    expect(result['Fred'].added).toBe(3);
    expect(result['Fred'].removed).toBe(4);
    expect(result['Anny'].added).toBe(2);
    expect(result['Anny'].removed).toBe(3);   
});

test('Can combine stat arrays', () => {
    let someStuff = new ExportingArray([
       { added: 1, removed: 2 },
       { added: 3, removed: 4 }
    ]);

    let someOtherStuff = new ExportingArray([
       { added: 0, removed: 0 },
       { added: 1, removed: 2 },
       { added: 2, removed: 3 }
    ]);

    let result = someStuff.combine(someOtherStuff, (a, b) => ({
        added: a.added + b.added,
        removed: a.removed + b.removed
    })).export();

    expect(result[0].added).toBe(1);
    expect(result[0].removed).toBe(2);
    expect(result[1].added).toBe(4);
    expect(result[1].removed).toBe(6);
    expect(result[2].added).toBe(2);
    expect(result[2].removed).toBe(3);   
});