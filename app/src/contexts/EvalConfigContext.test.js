import { describe, expect, it } from 'vitest'

import { syncLegacySkills } from './EvalConfigContext'

describe('syncLegacySkills', () => {
    it('migrates legacy skillA/skillB when skills[] is missing', () => {
        const config = syncLegacySkills({
            skillA: { filename: 'alpha.txt', content: 'alpha' },
            skillB: { filename: 'beta.txt', content: 'beta' },
        })

        expect(config.skills).toHaveLength(2)
        expect(config.skillA.filename).toBe('alpha.txt')
        expect(config.skillB.filename).toBe('beta.txt')
    })

    it('preserves an explicit empty skills[] array instead of reviving legacy skills', () => {
        const config = syncLegacySkills({
            skills: [],
            skillA: { filename: 'alpha.txt', content: 'alpha' },
            skillB: { filename: 'beta.txt', content: 'beta' },
        })

        expect(config.skills).toEqual([])
        expect(config.skillA).toEqual({ filename: '', content: '' })
        expect(config.skillB).toEqual({ filename: '', content: '' })
    })
})
