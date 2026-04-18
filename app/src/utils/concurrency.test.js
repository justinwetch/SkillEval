import { describe, expect, it } from 'vitest'

import { runWithConcurrency } from './concurrency'

describe('runWithConcurrency', () => {
    it('preserves order while limiting parallel work', async () => {
        const result = await runWithConcurrency([1, 2, 3], 2, async (value) => value * 2)
        expect(result).toEqual([2, 4, 6])
    })
})
