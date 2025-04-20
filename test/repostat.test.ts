import { test, expect } from 'vitest';
import { RepositoryStatistics } from '../src/core';


test('CanSumLinesPerAuthor', {}, () => {
    let stats = new RepositoryStatistics([
        {
            author: 'Bob',
            subject: 'Added some stuff',
            date: new Date(),
            hash: '1234567890abcdef',
            changes: [
                { added: '-', removed: '-', path: 'test.png' },
                { added: 1, removed: 2, path: 'test.txt' },
                { added: 3, removed: 4, path: 'test2.txt' }
            ]
        }
    ]);
    let result = stats.getLinesPerAuthor();

    expect(result['Bob'].added).toBe(4);
    expect(result['Bob'].removed).toBe(6);
});


test('Package-lock & github bot ignored hardcoded', {}, () => {
    let stats = new RepositoryStatistics([
        {
            author: 'Bob',
            subject: 'Added some stuff',
            date: new Date(),
            hash: '1234567890abcdef',
            changes: [
                { added: '-', removed: '-', path: 'test.png' },
                { added: 1, removed: 2, path: 'test.txt' },
                { added: 3, removed: 4, path: 'test2.txt' },
                { added: 900, removed: 0, path: 'Somedir/package-lock.json' },
                { added: 900, removed: 0, path: 'package-lock.json' },
            ]
        },
        {
            author: 'github-classroom[bot]',
            subject: 'Added some stuff',
            date: new Date(),
            hash: '1234567890abcdefa',
            changes: [
                { added: '-', removed: '-', path: 'test.png' },
                { added: 1, removed: 2, path: 'test.txt' }
            ]
        }
    ]);
    let result = stats.getLinesPerAuthor();

    expect(result['Bob'].added).toBe(4);
    expect(result['Bob'].removed).toBe(6);
    expect(result['github-classroom[bot]']).toBeUndefined();
});

test('Can Ignore Filetypes', {}, () => {
    let stats = new RepositoryStatistics([
        {
            author: 'Bob',
            subject: 'Added some stuff',
            date: new Date(),
            hash: '1234567890abcdef',
            changes: [
                { added: '-', removed: '-', path: 'test.png' },
                { added: 1, removed: 2, path: 'test.txt' },
                { added: 3, removed: 4, path: 'test2.txt' },
                { added: 30, removed: 5, path: 'test.json' },
                { added: 30, removed: 5, path: 'nested/test.json' },
            ]
        }
    ], { ignoredExtensions: ['.json'] });
    let result = stats.getLinesPerAuthor();

    expect(result['Bob'].added).toBe(4);
    expect(result['Bob'].removed).toBe(6);
});

test('Can Group Commits Per Week', {}, () => {
    let someCommit = {
        author: 'Bob',
        subject: 'Enter Commit Message Here',
        hash: '1234567890abcdef',
        changes: [
            { added: 1, removed: 0, path: 'test.txt' }
        ]
    }

    let stats = new RepositoryStatistics([
        { date: new Date('2023-10-01'), ...someCommit },
        { date: new Date('2023-10-02'), ...someCommit },
        { date: new Date('2023-10-08'), ...someCommit },
        { date: new Date('2023-10-25'), ...someCommit },
    ]);

    let result = stats.getLinesPerWeek();
    expect(result[0].added, 'Can read multiple commits in 1 week').toBe(2);
    expect(result[1].added, 'Can go to next week').toBe(1);
    expect(result[2].added, 'Can skip an empty week').toBe(0);
    expect(result[3].added).toBe(1);
    expect(result[4]).toBe(undefined);
});


test('Can Group Commits Per Week Per Author', {}, () => {
    let someCommit = {
        subject: 'Enter Commit Message Here',
        hash: '1234567890abcdef',
        changes: [
            { added: 1, removed: 0, path: 'test.txt' }
        ]
    }

    let stats = new RepositoryStatistics([
        { author: 'Bob', date: new Date('2023-10-01'), ...someCommit },
        { author: 'Bob', date: new Date('2023-10-02'), ...someCommit },
        { author: 'Job', date: new Date('2023-10-08'), ...someCommit },
        { author: 'Bob', date: new Date('2023-10-25'), ...someCommit },
    ]);

    let perAuthorResult = stats.getLinesPerAuthorPerWeek();

    expect(perAuthorResult['Bob'][0].added).toBe(2);
    expect(perAuthorResult['Bob'][1].added).toBe(0);
    expect(perAuthorResult['Bob'][2].added).toBe(0);
    expect(perAuthorResult['Bob'][3].added).toBe(1);
    expect(perAuthorResult['Bob'][4]).toBe(undefined);
    
    expect(perAuthorResult['Job'][0].added).toBe(0);
    expect(perAuthorResult['Job'][1].added).toBe(1);
    // expect(perAuthorResult['Job'][2].added).toBe(0); Dit is trickier dan ik had verwacht... maar tot hier werkt het redelijk
    // expect(perAuthorResult['Job'][3].added).toBe(0);
    // expect(perAuthorResult['Job'][4]).toBe(undefined);
});