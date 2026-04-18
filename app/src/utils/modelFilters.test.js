import { describe, expect, it } from 'vitest'

import { getConfigGenerationModels } from './modelFilters'

describe('getConfigGenerationModels', () => {
    it('returns only connected language models', () => {
        expect(
            getConfigGenerationModels([
                { providerId: 'gemini', modelId: 'gemini-2.5-pro', kind: 'language', connected: true },
                { providerId: 'gemini', modelId: 'text-embedding-004', kind: 'embedding', connected: true },
                { providerId: 'codex-bridge', modelId: 'gpt-5', kind: 'language', connected: false },
            ]),
        ).toHaveLength(1)
    })
})
