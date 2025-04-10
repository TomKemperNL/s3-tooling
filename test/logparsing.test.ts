import { test, expect } from 'vitest';
import { parseLog } from '../src/filesystem_client';

test('CanParseChanges', () => {
    let result = parseLog(`eenofandere0123hash,2025-04-09T13:51:33+02:00,WoopWoop,Icons toegvoegd

-       -       client/src/images/delete.png
-       -       client/src/images/edit.jpg
-       -       client/src/images/edit.webp
23      4       client/src/styles/privateBuilts.css
22      10      client/src/views/privateBuilts.js`.split('\n'));

        expect(result[0].author).toBe('WoopWoop');
        expect(result[0].changes.length).toBe(5);
});


test('CanParseSubjectWithCommas', () => {
    let result = parseLog(`eenofandere0123hash,2025-04-09T13:51:33+02:00,WoopWoop,Icons, en andere zaken, toegvoegd`.split('\n'));

        expect(result[0].author).toBe('WoopWoop');
        expect(result[0].subject).toBe('Icons, en andere zaken, toegvoegd');
});
