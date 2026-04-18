import { describe, expect, it } from 'vitest'

import { extractJsonObject } from './jsonResponse'

describe('extractJsonObject', () => {
    it('parses fenced JSON payloads', () => {
        expect(
            extractJsonObject('```json\n{"outputType":"text","criteria":[],"prompts":[]}\n```'),
        ).toEqual({ outputType: 'text', criteria: [], prompts: [] })
    })
})
