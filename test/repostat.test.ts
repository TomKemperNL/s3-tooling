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