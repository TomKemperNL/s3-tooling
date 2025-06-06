import { test, expect } from 'vitest';
import { ProjectStatistics } from '../src/main/project-statistics';
import { extensions } from 'sequelize/lib/utils/validator-extras';
import { a } from 'vitest/dist/chunks/suite.d.FvehnV49.js';
import { Issue, PullRequest } from '../src/shared';


test('CanSumLinesPerAuthor', {}, () => {
    let stats = new ProjectStatistics([
        {
            author: 'Bob',
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
                author: 'Bob',
                body: "I want it now!\nAnd it better be good.",
                createdAt: new Date()
            }
        ]
    }]);

    let results = stats.groupByAuthor().map(s => s.getLines()).export();

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

    let stats = new ProjectStatistics([
        { createdAt: new Date('2023-10-01'), ...someIssueOrPr },
        { createdAt: new Date('2023-10-02'), ...someIssueOrPr },
        { createdAt: new Date('2023-10-08'), ...someIssueOrPr },
        { createdAt: new Date('2023-10-25'), ...someIssueOrPr },
    ].reverse(), [], []);

    let result = stats.groupByWeek().map((w) => w.getLines()).export();
    expect(result[0].added, 'Can read multiple issues in 1 week').toBe(4);
    expect(result[1].added, 'Can go to next week').toBe(2);
    expect(result[2].added, 'Can skip an empty week').toBe(0);
    expect(result[3].added).toBe(2);
    expect(result[4]).toBe(undefined);
});
