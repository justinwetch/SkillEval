import { describe, expect, it, vi } from 'vitest'

import { createEvaluation, runAllEvals, runSingleEval } from './runEval'

describe('runSingleEval', () => {
    it('forces skills to produce a final evaluatable output without clarification', async () => {
        const adapter = {
            chat: vi.fn(async ({ system }) => ({
                text: system,
            })),
        }

        const result = await runSingleEval({
            adapter,
            modelSelection: { providerId: 'gemini', modelId: 'gemini-3.1-pro-preview' },
            skillContent: 'Ask the user what stack they prefer before building.',
            prompt: 'Build a profile avatar component.',
        })

        expect(result.content).toContain('Do not ask clarifying questions')
        expect(result.content).toContain('produce a complete final answer now')
        expect(result.content).toContain('If details are missing, make reasonable assumptions')
    })
})

describe('runAllEvals', () => {
    const modelSelection = { providerId: 'gemini', modelId: 'gemini-3.1-pro-preview' }
    const skillA = { content: 'Skill A' }
    const skillB = { content: 'Skill B' }

    it('runs only selected prompts and preserves untouched rows', async () => {
        const adapter = {
            chat: vi.fn(async ({ messages, system }) => ({
                text: `${system.includes('Skill A') ? 'A' : 'B'}:${messages[0].content}`,
            })),
        }
        const prompts = ['one', 'two', 'three']
        const existing = prompts.map(createEvaluation)
        existing[0].resultA = { content: 'old-a', error: null, elapsed: 1, status: 'complete' }

        const results = await runAllEvals({
            adapter,
            modelSelection,
            skillA,
            skillB,
            prompts,
            evaluations: existing,
            promptIndexes: [1],
        })

        expect(adapter.chat).toHaveBeenCalledTimes(2)
        expect(results[0].resultA.content).toBe('old-a')
        expect(results[1].resultA.content).toBe('A:two')
        expect(results[1].resultB.content).toBe('B:two')
        expect(results[2].resultA.status).toBe('pending')
    })

    it('resumes only missing or failed sides', async () => {
        const adapter = {
            chat: vi.fn(async ({ messages, system }) => ({
                text: `${system.includes('Skill A') ? 'A' : 'B'}:${messages[0].content}`,
            })),
        }
        const prompts = ['one']
        const existing = prompts.map(createEvaluation)
        existing[0].resultA = { content: 'done', error: null, elapsed: 1, status: 'complete' }
        existing[0].resultB = { content: '', error: 'failed', elapsed: 1, status: 'error' }

        const results = await runAllEvals({
            adapter,
            modelSelection,
            skillA,
            skillB,
            prompts,
            evaluations: existing,
            resumeOnly: true,
        })

        expect(adapter.chat).toHaveBeenCalledTimes(1)
        expect(results[0].resultA.content).toBe('done')
        expect(results[0].resultB.content).toBe('B:one')
    })

    it('does not start more model calls after stop is requested', async () => {
        const adapter = {
            chat: vi.fn(async ({ messages }) => ({ text: messages[0].content })),
        }

        await runAllEvals({
            adapter,
            modelSelection,
            skillA,
            skillB,
            prompts: ['one', 'two'],
            shouldStop: () => true,
        })

        expect(adapter.chat).not.toHaveBeenCalled()
    })
})
