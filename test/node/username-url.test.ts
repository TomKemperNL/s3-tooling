import { expect, it } from 'vitest'
import { getUsernameFromUrl } from '../../src/main/canvas-client'

let urls: [(string | null), string][] = [
    ['Alik-Hu', 'https://github.com/HU-SD-S2-studenten-2425/sd-s2-verantwoording-Alik-Hu.git'],
    ['owziezo', 'https://github.com/HU-SD-S2-studenten-2425/sd-s2-verantwoording-owziezo'],
    ['owziezo', 'git@github.com:HU-SD-S2-studenten-2425/sd-s2-verantwoording-owziezo.git'],
    ['Jax-Tarra-Borres', 'https://github.com/HU-SD-S2-studenten-2425/sd-s2-verantwoording-Jax-Tarra-Borres/tree/main'],
    [null, 'https://github.com/noavandenboom/Nano-App-Store/tree/master'],
    ['DriesBoevink', 'https://github.com/HU-SD-S2-studenten-2425/sd-s2-verantwoording-DriesBoevink/blob/main/Verantwoordingsdocument_SD_S2.md']
]

it.each(urls)('%s from x', (expectedResult, val) => {
    expect(getUsernameFromUrl(val, 'sd-s2-verantwoording')).toBe(expectedResult)
})