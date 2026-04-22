import { chatWithModel } from './llmHubClient'
import { runWithConcurrency } from './concurrency'
import {
    createEvaluation,
    createPendingJudge,
    getBaselineSkill,
    getChallengerSkills,
    normalizeEvaluation,
} from './evaluationModel'

export const EVALUATION_MODE_PROMPT = `You are running inside an automated skill evaluation.
Do not ask clarifying questions, pause for user direction, request preferences, or propose options instead of completing the task.
If details are missing, make reasonable assumptions and produce a complete final answer now.
For frontend/UI tasks, provide the complete implementation artifact requested by the prompt.
When a prompt does not explicitly require a framework, prefer one standalone HTML document with embedded CSS so the result can be previewed directly.`

function normalizeIndexes(promptIndexes, length) {
    if (!promptIndexes) {
        return Array.from({ length }, (_, idx) => idx)
    }
    return [...new Set(promptIndexes)]
        .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < length)
}

function shouldRunResult(result, resumeOnly) {
    if (!resumeOnly) return true
    return result?.status !== 'complete'
}

function invalidateComparisonsForSkill(evaluation, skills, skillId) {
    const baselineSkill = getBaselineSkill(skills)
    const challengers = getChallengerSkills(skills)

    if (!baselineSkill || challengers.length === 0) {
        return evaluation
    }

    const nextComparisons = { ...(evaluation.comparisons || {}) }
    if (skillId === baselineSkill.id) {
        challengers.forEach((challenger) => {
            nextComparisons[challenger.id] = {
                ...(nextComparisons[challenger.id] || {}),
                baselineSkillId: baselineSkill.id,
                challengerSkillId: challenger.id,
                judge: createPendingJudge(),
                screenshotA: null,
                screenshotB: null,
            }
        })
    } else if (nextComparisons[skillId]) {
        nextComparisons[skillId] = {
            ...nextComparisons[skillId],
            baselineSkillId: baselineSkill.id,
            challengerSkillId: skillId,
            judge: createPendingJudge(),
            screenshotA: null,
            screenshotB: null,
        }
    }

    return {
        ...evaluation,
        comparisons: nextComparisons,
    }
}

export async function runSingleEval({
    adapter,
    modelSelection,
    skillContent,
    baseSystemPrompt = '',
    prompt,
    maxTokens = 8192,
}) {
    const startTime = Date.now()
    const systemPrompt = [
        EVALUATION_MODE_PROMPT,
        baseSystemPrompt,
        skillContent,
    ].filter(Boolean).join('\n\n')

    try {
        const content = await chatWithModel({
            adapter,
            selection: modelSelection,
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }],
            maxOutputTokens: maxTokens,
        })
        return { content, error: null, elapsed: Date.now() - startTime }
    } catch (error) {
        return { content: '', error: error.message, elapsed: Date.now() - startTime }
    }
}

export async function runAllEvals({
    adapter,
    modelSelection,
    skills,
    prompts,
    evaluations: existingEvaluations,
    promptIndexes,
    resumeOnly = false,
    maxTokens = 8192,
    baseSystemPrompt = '',
    onProgress,
    shouldStop = () => false,
}) {
    const activeSkills = skills || []
    const evaluations = existingEvaluations?.length === prompts.length
        ? existingEvaluations.map((ev, idx) => normalizeEvaluation(ev, prompts[idx], idx, activeSkills))
        : prompts.map((prompt, idx) => createEvaluation(prompt, idx, activeSkills))

    const targetIndexes = normalizeIndexes(promptIndexes, prompts.length)
    const jobs = targetIndexes.flatMap((promptIndex) => {
        const ev = evaluations[promptIndex]
        return activeSkills
            .filter((skill) => shouldRunResult(ev.resultsBySkillId?.[skill.id], resumeOnly))
            .map((skill) => ({ promptIndex, skill }))
    })

    const total = jobs.length
    let completed = 0

    onProgress?.({ current: completed, total, phase: 'generating' })

    await runWithConcurrency(jobs, 3, async ({ promptIndex, skill }) => {
        if (shouldStop()) return

        const prompt = prompts[promptIndex]
        const result = await runSingleEval({
            adapter,
            modelSelection,
            skillContent: skill.content,
            baseSystemPrompt,
            prompt,
            maxTokens,
        })

        const currentEvaluation = evaluations[promptIndex]
        const nextEvaluation = {
            ...currentEvaluation,
            resultsBySkillId: {
                ...currentEvaluation.resultsBySkillId,
                [skill.id]: {
                    ...result,
                    status: result.error ? 'error' : 'complete',
                },
            },
        }

        evaluations[promptIndex] = invalidateComparisonsForSkill(nextEvaluation, activeSkills, skill.id)

        completed += 1
        onProgress?.({ current: completed, total, phase: 'generating' })
    })

    return evaluations.map((ev, idx) => normalizeEvaluation(ev, prompts[idx], idx, activeSkills))
}
