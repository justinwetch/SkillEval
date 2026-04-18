import { describe, expect, it } from 'vitest'

import { buildJudgeMessages } from './buildJudgeMessages'

describe('buildJudgeMessages', () => {
    it('creates provider-agnostic multimodal user content', () => {
        const messages = buildJudgeMessages({
            prompt: 'Design a card',
            resultA: '<div>A</div>',
            resultB: '<div>B</div>',
            screenshotA: 'Zm9v',
            screenshotB: 'YmFy',
            includeCode: true,
            isVisual: true,
            skillNames: { skillA: 'A', skillB: 'B' },
        })

        expect(messages[0].role).toBe('user')
        expect(messages[0].content.some((part) => part.type === 'image')).toBe(true)
    })
})
