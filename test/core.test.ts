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