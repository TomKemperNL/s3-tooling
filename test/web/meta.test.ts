import { test, expect } from "vitest";


test('Does it simulate a browser', () => {
    expect(window).toBeDefined();
})