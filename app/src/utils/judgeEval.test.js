import { describe, expect, it, vi } from 'vitest'

import { judgeAllEvals } from './judgeEval'

function completeEval(id) {
    return {
        id,
        prompt: `Prompt ${id}`,
        resultA: { content: `A${id}`, error: null, elapsed: 1, status: 'complete' },
        resultB: { content: `B${id}`, error: null, elapsed: 1, status: 'complete' },
        judge: { status: 'pending', result: '', scores: null, elapsed: null },
    }
}

describe('judgeAllEvals', () => {
    it('judges only selected evaluation ids', async () => {
        const adapter = {
            chat: vi.fn(async () => ({
                text: JSON.stringify({ winner: 'tie', scoreA: 1, scoreB: 1, breakdown: {} }),
            })),
        }
        const evaluations = [completeEval(1), completeEval(2)]

        const results = await judgeAllEvals({
            adapter,
            modelSelection: { providerId: 'gemini', modelId: 'gemini-3.1-pro-preview' },
            evaluations,
            criteria: [],
            outputType: 'text',
            evaluationIds: [2],
        })

        expect(adapter.chat).toHaveBeenCalledTimes(1)
        expect(results[0].judge.status).toBe('pending')
        expect(results[1].judge.status).toBe('complete')
    })

    it('does not start judging after stop is requested', async () => {
        const adapter = {
            chat: vi.fn(async () => ({
                text: JSON.stringify({ winner: 'tie', scoreA: 1, scoreB: 1, breakdown: {} }),
            })),
        }

        await judgeAllEvals({
            adapter,
            modelSelection: { providerId: 'gemini', modelId: 'gemini-3.1-pro-preview' },
            evaluations: [completeEval(1)],
            criteria: [],
            outputType: 'text',
            shouldStop: () => true,
        })

        expect(adapter.chat).not.toHaveBeenCalled()
    })
})
