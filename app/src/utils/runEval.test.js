import { describe, expect, it, vi } from 'vitest'

import { createEvaluation } from './evaluationModel'
import { runAllEvals, runSingleEval } from './runEval'

const modelSelection = { providerId: 'gemini', modelId: 'gemini-3.1-pro-preview' }

const skills = [
    { id: 'baseline', filename: 'baseline.md', content: 'Skill A' },
    { id: 'challenger-1', filename: 'challenger-1.md', content: 'Skill B' },
]

describe('runSingleEval', () => {
    it('forces skills to produce a final evaluatable output without clarification', async () => {
        const adapter = {
            chat: vi.fn(async ({ system }) => ({
                text: system,
            })),
        }

        const result = await runSingleEval({
            adapter,
            modelSelection,
            skillContent: 'Ask the user what stack they prefer before building.',
            prompt: 'Build a profile avatar component.',
        })

        expect(result.content).toContain('Do not ask clarifying questions')
        expect(result.content).toContain('produce a complete final answer now')
        expect(result.content).toContain('If details are missing, make reasonable assumptions')
    })
})

describe('runAllEvals', () => {
    it('runs only selected prompts and preserves untouched rows', async () => {
        const adapter = {
            chat: vi.fn(async ({ messages, system }) => ({
                text: `${system.includes('Skill A') ? 'A' : 'B'}:${messages[0].content}`,
            })),
        }
        const prompts = ['one', 'two', 'three']
        const existing = prompts.map((prompt, index) => createEvaluation(prompt, index, skills))
        existing[0].resultsBySkillId[skills[0].id] = { content: 'old-a', error: null, elapsed: 1, status: 'complete' }

        const results = await runAllEvals({
            adapter,
            modelSelection,
            skills,
            prompts,
            evaluations: existing,
            promptIndexes: [1],
        })

        expect(adapter.chat).toHaveBeenCalledTimes(2)
        expect(results[0].resultsBySkillId[skills[0].id].content).toBe('old-a')
        expect(results[1].resultsBySkillId[skills[0].id].content).toBe('A:two')
        expect(results[1].resultsBySkillId[skills[1].id].content).toBe('B:two')
        expect(results[2].resultsBySkillId[skills[0].id].status).toBe('pending')
    })

    it('resumes only missing or failed skills', async () => {
        const adapter = {
            chat: vi.fn(async ({ messages, system }) => ({
                text: `${system.includes('Skill A') ? 'A' : 'B'}:${messages[0].content}`,
            })),
        }
        const prompts = ['one']
        const existing = prompts.map((prompt, index) => createEvaluation(prompt, index, skills))
        existing[0].resultsBySkillId[skills[0].id] = { content: 'done', error: null, elapsed: 1, status: 'complete' }
        existing[0].resultsBySkillId[skills[1].id] = { content: '', error: 'failed', elapsed: 1, status: 'error' }

        const results = await runAllEvals({
            adapter,
            modelSelection,
            skills,
            prompts,
            evaluations: existing,
            resumeOnly: true,
        })

        expect(adapter.chat).toHaveBeenCalledTimes(1)
        expect(results[0].resultsBySkillId[skills[0].id].content).toBe('done')
        expect(results[0].resultsBySkillId[skills[1].id].content).toBe('B:one')
    })

    it('invalidates only the affected challenger comparison when rerunning one challenger', async () => {
        const multiSkills = [
            ...skills,
            { id: 'challenger-2', filename: 'challenger-2.md', content: 'Skill C' },
        ]
        const adapter = {
            chat: vi.fn(async ({ messages, system }) => ({
                text: `${system.includes('Skill C') ? 'C' : system.includes('Skill A') ? 'A' : 'B'}:${messages[0].content}`,
            })),
        }
        const prompts = ['one']
        const existing = prompts.map((prompt, index) => createEvaluation(prompt, index, multiSkills))

        existing[0].resultsBySkillId[multiSkills[0].id] = { content: 'baseline', error: null, elapsed: 1, status: 'complete' }
        existing[0].resultsBySkillId[multiSkills[1].id] = { content: 'challenger-1', error: null, elapsed: 1, status: 'complete' }
        existing[0].resultsBySkillId[multiSkills[2].id] = { content: '', error: 'failed', elapsed: 1, status: 'error' }
        existing[0].comparisons[multiSkills[1].id].judge = { status: 'complete', result: 'keep', scores: { winner: 'A' }, elapsed: 1 }
        existing[0].comparisons[multiSkills[2].id].judge = { status: 'complete', result: 'reset', scores: { winner: 'B' }, elapsed: 1 }

        const results = await runAllEvals({
            adapter,
            modelSelection,
            skills: multiSkills,
            prompts,
            evaluations: existing,
            resumeOnly: true,
        })

        expect(adapter.chat).toHaveBeenCalledTimes(1)
        expect(results[0].resultsBySkillId[multiSkills[2].id].content).toBe('C:one')
        expect(results[0].comparisons[multiSkills[1].id].judge.status).toBe('complete')
        expect(results[0].comparisons[multiSkills[2].id].judge.status).toBe('pending')
    })

    it('does not start more model calls after stop is requested', async () => {
        const adapter = {
            chat: vi.fn(async ({ messages }) => ({ text: messages[0].content })),
        }

        await runAllEvals({
            adapter,
            modelSelection,
            skills,
            prompts: ['one', 'two'],
            shouldStop: () => true,
        })

        expect(adapter.chat).not.toHaveBeenCalled()
    })
})
