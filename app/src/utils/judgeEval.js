import { chatWithModel } from './llmHubClient'
import { buildJudgePrompt, parseJudgeResponse } from './buildJudgePrompt'
import { buildJudgeMessages } from './buildJudgeMessages'
import { runWithConcurrency } from './concurrency'
import { captureScreenshots } from './screenshot'
import {
    getBaselineSkill,
    getChallengerSkills,
    normalizeEvaluation,
} from './evaluationModel'

function normalizeIds(evaluationIds) {
    if (!evaluationIds) return null
    return new Set(evaluationIds.filter((id) => Number.isInteger(id)))
}

function normalizeSkillIds(skillIds) {
    if (!skillIds) return null
    return new Set(skillIds.filter(Boolean))
}

export async function judgeSingleEval({
    adapter,
    modelSelection,
    evaluation,
    criteria,
    outputType,
    skillNames = { skillA: 'Skill A', skillB: 'Skill B' },
}) {
    const startTime = Date.now()
    const isVisual = outputType === 'visual' || outputType === 'both'
    const includeCode = outputType === 'text' || outputType === 'both'

    try {
        let screenshots = { screenshotA: null, screenshotB: null }
        if (isVisual) {
            screenshots = await captureScreenshots(
                evaluation.resultA.content,
                evaluation.resultB.content,
            )
        }

        const resultText = await chatWithModel({
            adapter,
            selection: modelSelection,
            system: buildJudgePrompt(criteria, outputType),
            messages: buildJudgeMessages({
                prompt: evaluation.prompt,
                resultA: evaluation.resultA.content,
                resultB: evaluation.resultB.content,
                screenshotA: screenshots.screenshotA,
                screenshotB: screenshots.screenshotB,
                includeCode,
                isVisual,
                skillNames,
            }),
            maxOutputTokens: 4096,
        })
        const scores = parseJudgeResponse(resultText)

        return {
            status: 'complete',
            result: resultText,
            scores,
            elapsed: Date.now() - startTime,
            screenshotA: screenshots.screenshotA,
            screenshotB: screenshots.screenshotB,
        }
    } catch (error) {
        return {
            status: 'error',
            result: `Error: ${error.message}`,
            scores: null,
            elapsed: Date.now() - startTime,
            screenshotA: null,
            screenshotB: null,
        }
    }
}

export async function judgeAllEvals({
    adapter,
    modelSelection,
    evaluations,
    criteria,
    outputType,
    skills,
    evaluationIds,
    challengerSkillIds,
    onProgress,
    shouldStop = () => false,
}) {
    const activeSkills = skills || []
    const baselineSkill = getBaselineSkill(activeSkills)
    const challengerSkills = getChallengerSkills(activeSkills)
    const targetIds = normalizeIds(evaluationIds)
    const targetChallengerIds = normalizeSkillIds(challengerSkillIds)

    const normalizedEvaluations = evaluations.map((ev, idx) => (
        normalizeEvaluation(ev, ev.prompt, idx, activeSkills)
    ))

    const jobs = normalizedEvaluations.flatMap((evaluation) => {
        if (targetIds && !targetIds.has(evaluation.id)) {
            return []
        }

        return challengerSkills
            .filter((challenger) => {
                if (targetChallengerIds && !targetChallengerIds.has(challenger.id)) {
                    return false
                }
                const baselineResult = evaluation.resultsBySkillId?.[baselineSkill?.id]
                const challengerResult = evaluation.resultsBySkillId?.[challenger.id]
                const comparison = evaluation.comparisons?.[challenger.id]
                return baselineResult?.status === 'complete'
                    && challengerResult?.status === 'complete'
                    && comparison?.judge?.status !== 'complete'
            })
            .map((challenger) => ({ evaluationId: evaluation.id, challenger }))
    })

    const total = jobs.length
    let completed = 0

    onProgress?.({ current: completed, total, phase: 'judging' })

    await runWithConcurrency(jobs, 3, async ({ evaluationId, challenger }) => {
        if (shouldStop()) return

        const evaluationIndex = normalizedEvaluations.findIndex((ev) => ev.id === evaluationId)
        if (evaluationIndex < 0) return

        const evaluation = normalizedEvaluations[evaluationIndex]
        const result = await judgeSingleEval({
            adapter,
            modelSelection,
            evaluation: {
                prompt: evaluation.prompt,
                resultA: evaluation.resultsBySkillId?.[baselineSkill.id],
                resultB: evaluation.resultsBySkillId?.[challenger.id],
            },
            criteria,
            outputType,
            skillNames: {
                skillA: baselineSkill.filename || 'Baseline',
                skillB: challenger.filename || 'Challenger',
            },
        })

        const latestEvaluation = normalizedEvaluations[evaluationIndex]
        normalizedEvaluations[evaluationIndex] = {
            ...latestEvaluation,
            comparisons: {
                ...latestEvaluation.comparisons,
                [challenger.id]: {
                    ...(latestEvaluation.comparisons?.[challenger.id] || {}),
                    baselineSkillId: baselineSkill.id,
                    challengerSkillId: challenger.id,
                    judge: {
                        status: result.status,
                        result: result.result,
                        scores: result.scores,
                        elapsed: result.elapsed,
                    },
                    screenshotA: result.screenshotA,
                    screenshotB: result.screenshotB,
                },
            },
        }

        completed += 1
        onProgress?.({ current: completed, total, phase: 'judging' })
    })

    return normalizedEvaluations.map((evaluation, idx) => normalizeEvaluation(
        evaluation,
        evaluation.prompt,
        idx,
        activeSkills,
    ))
}
