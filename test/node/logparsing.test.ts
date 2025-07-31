import { test, expect } from 'vitest';
import { parseBlame, parseLog } from '../../src/main/filesystem-client';

test('CanParseChanges', () => {
    let result = parseLog(`eenofandere0123hash,2025-04-09T13:51:33+02:00,WoopWoop,Icons toegvoegd

-       -       client/src/images/delete.png
-       -       client/src/images/edit.jpg
-       -       client/src/images/edit.webp
23      4       client/src/styles/privateBuilts.css
22      10      client/src/views/privateBuilts.js`.split('\n'));

        expect(result[0].author).toBe('WoopWoop');
        expect(result[0].changes.length).toBe(5);
        expect(result[0].changes[4].added).toBe(22);
        expect(result[0].changes[4].removed).toBe(10);
});

test('CanParseMultipleChanges', () => {
    let result = parseLog(`eenofandere0123hash,2025-04-09T13:51:33+02:00,WoopWoop,Icons toegvoegd

-       -       client/src/images/delete.png
22      10      client/src/views/privateBuilts.js
eenofandere0123hash,2025-04-09T13:51:33+02:00,WoopWoop2,Icons toegvoegd

-       -       client/src/images/delete.png
22      10      client/src/views/privateBuilts.js`.split('\n'));

        expect(result[1].author).toBe('WoopWoop2');
        expect(result[1].changes.length).toBe(2);
});

test('CanParseSubjectWithCommas', () => {
    let result = parseLog(`eenofandere0123hash,2025-04-09T13:51:33+02:00,WoopWoop,Icons, en andere zaken, toegvoegd`.split('\n'));

        expect(result[0].author).toBe('WoopWoop');
        expect(result[0].subject).toBe('Icons, en andere zaken, toegvoegd');
});

test('Can Parse Author with Spaces', () => {
    let result = parseLog(`eenofandere0123hash,2025-04-09T13:51:33+02:00,Woop Woop,Icons, en andere zaken, toegvoegd`.split('\n'));

    expect(result[0].author).toBe('Woop Woop');
});

test('Can parse Blame statistics', () => {
    let result = parseBlame(`c16973a5 (ABC 2025-05-08 15:14:58 +0200  3) -- Product table
75fd3085 (ABC 2025-04-16 14:54:54 +0200  4) create table if not exists public.products
75fd3085 (DEF 2025-04-16 14:54:54 +0200  5) (
        `.split('\n'));
    expect(result['ABC']).toBe(2);
    expect(result['DEF']).toBe(1);
});

test('Can parse Blame authors with spaces', () => {
    let result = parseBlame(`c16973a5 (Bob Test 2025-05-08 15:14:58 +0200  3) -- Product table
75fd3085 (Bob Test 2025-04-16 14:54:54 +0200  4) create table if not exists public.products
        `.split('\n'));
    expect(result).toStrictEqual({ 'Bob Test': 2 });
})