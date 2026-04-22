import { describe, expect, it, vi } from 'vitest'

import { createEvaluation } from './evaluationModel'
import { judgeAllEvals } from './judgeEval'

const modelSelection = { providerId: 'gemini', modelId: 'gemini-3.1-pro-preview' }

const skills = [
    { id: 'baseline', filename: 'baseline.md', content: 'Baseline skill' },
    { id: 'challenger-1', filename: 'challenger-1.md', content: 'Challenger one' },
    { id: 'challenger-2', filename: 'challenger-2.md', content: 'Challenger two' },
]

function createCompleteEvaluation(id) {
    const evaluation = createEvaluation(`Prompt ${id}`, id - 1, skills)
    skills.forEach((skill, index) => {
        evaluation.resultsBySkillId[skill.id] = {
            content: `${index === 0 ? 'Baseline' : `Challenger ${index}`} output ${id}`,
            error: null,
            elapsed: 1,
            status: 'complete',
        }
    })
    return evaluation
}

describe('judgeAllEvals', () => {
    it('judges only selected evaluation ids', async () => {
        const adapter = {
            chat: vi.fn(async () => ({
                text: JSON.stringify({ winner: 'tie', scoreA: 1, scoreB: 1, breakdown: {} }),
            })),
        }
        const evaluations = [createCompleteEvaluation(1), createCompleteEvaluation(2)]

        const results = await judgeAllEvals({
            adapter,
            modelSelection,
            evaluations,
            criteria: [],
            outputType: 'text',
            skills,
            evaluationIds: [2],
        })

        expect(adapter.chat).toHaveBeenCalledTimes(2)
        expect(results[0].comparisons[skills[1].id].judge.status).toBe('pending')
        expect(results[0].comparisons[skills[2].id].judge.status).toBe('pending')
        expect(results[1].comparisons[skills[1].id].judge.status).toBe('complete')
        expect(results[1].comparisons[skills[2].id].judge.status).toBe('complete')
    })

    it('judges only selected challengers for the active baseline', async () => {
        const adapter = {
            chat: vi.fn(async () => ({
                text: JSON.stringify({ winner: 'A', scoreA: 3, scoreB: 2, breakdown: {} }),
            })),
        }
        const evaluations = [createCompleteEvaluation(1)]

        const results = await judgeAllEvals({
            adapter,
            modelSelection,
            evaluations,
            criteria: [],
            outputType: 'text',
            skills,
            challengerSkillIds: [skills[2].id],
        })

        expect(adapter.chat).toHaveBeenCalledTimes(1)
        expect(results[0].comparisons[skills[1].id].judge.status).toBe('pending')
        expect(results[0].comparisons[skills[2].id].judge.status).toBe('complete')
    })

    it('does not start judging after stop is requested', async () => {
        const adapter = {
            chat: vi.fn(async () => ({
                text: JSON.stringify({ winner: 'tie', scoreA: 1, scoreB: 1, breakdown: {} }),
            })),
        }

        await judgeAllEvals({
            adapter,
            modelSelection,
            evaluations: [createCompleteEvaluation(1)],
            criteria: [],
            outputType: 'text',
            skills,
            shouldStop: () => true,
        })

        expect(adapter.chat).not.toHaveBeenCalled()
    })
})
