import { test, expect } from 'vitest';
import { ProjectStatistics } from '../src/main/project-statistics';
import { extensions } from 'sequelize/lib/utils/validator-extras';


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
    ],[{
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

    expect(results["Fred"].lines).toBe(3); //1 title, +2 body
    expect(results["Bob"].lines).toBe(4); //1 title, +1 body + 2 comments
});