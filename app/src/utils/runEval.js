import { chatWithModel } from './llmHubClient'
import { runWithConcurrency } from './concurrency'

export const EVALUATION_MODE_PROMPT = `You are running inside an automated skill evaluation.
Do not ask clarifying questions, pause for user direction, request preferences, or propose options instead of completing the task.
If details are missing, make reasonable assumptions and produce a complete final answer now.
For frontend/UI tasks, provide the complete implementation artifact requested by the prompt.
When a prompt does not explicitly require a framework, prefer one standalone HTML document with embedded CSS so the result can be previewed directly.`

export function createEvaluation(prompt, idx) {
    return {
        id: idx + 1,
        prompt,
        resultA: { content: '', error: null, elapsed: null, status: 'pending' },
        resultB: { content: '', error: null, elapsed: null, status: 'pending' },
        screenshotA: null,
        screenshotB: null,
        judge: { status: 'pending', result: '', scores: null, elapsed: null },
    }
}

function normalizeIndexes(promptIndexes, length) {
    if (!promptIndexes) {
        return Array.from({ length }, (_, idx) => idx)
    }
    return [...new Set(promptIndexes)]
        .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < length)
}

function shouldRunSide(result, resumeOnly) {
    if (!resumeOnly) return true
    return result?.status !== 'complete'
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
    skillA,
    skillB,
    prompts,
    evaluations: existingEvaluations,
    promptIndexes,
    resumeOnly = false,
    maxTokens = 8192,
    baseSystemPrompt = '',
    onProgress,
    shouldStop = () => false,
}) {
    const evaluations = existingEvaluations?.length === prompts.length
        ? existingEvaluations.map((ev, idx) => ({
            ...createEvaluation(prompts[idx], idx),
            ...ev,
            prompt: prompts[idx],
            resultA: ev.resultA || createEvaluation(prompts[idx], idx).resultA,
            resultB: ev.resultB || createEvaluation(prompts[idx], idx).resultB,
            judge: ev.judge || createEvaluation(prompts[idx], idx).judge,
        }))
        : prompts.map(createEvaluation)

    const targetIndexes = normalizeIndexes(promptIndexes, prompts.length).filter((idx) => {
        const ev = evaluations[idx]
        return shouldRunSide(ev.resultA, resumeOnly) || shouldRunSide(ev.resultB, resumeOnly)
    })

    const total = targetIndexes.reduce((count, idx) => {
        const ev = evaluations[idx]
        return count
            + (shouldRunSide(ev.resultA, resumeOnly) ? 1 : 0)
            + (shouldRunSide(ev.resultB, resumeOnly) ? 1 : 0)
    }, 0)
    let completed = 0

    onProgress?.({ current: completed, total, phase: 'generating' })

    await runWithConcurrency(targetIndexes, 3, async (promptIndex) => {
        if (shouldStop()) return

        const prompt = prompts[promptIndex]
        const ev = evaluations[promptIndex]
        const runA = shouldRunSide(ev.resultA, resumeOnly)
        const runB = shouldRunSide(ev.resultB, resumeOnly)

        const [resultA, resultB] = await Promise.all([
            runA
                ? runSingleEval({
                    adapter,
                    modelSelection,
                    skillContent: skillA.content,
                    baseSystemPrompt,
                    prompt,
                    maxTokens,
                })
                : Promise.resolve(null),
            runB
                ? runSingleEval({
                    adapter,
                    modelSelection,
                    skillContent: skillB.content,
                    baseSystemPrompt,
                    prompt,
                    maxTokens,
                })
                : Promise.resolve(null),
        ])

        if (resultA) {
            evaluations[promptIndex].resultA = { ...resultA, status: resultA.error ? 'error' : 'complete' }
            completed += 1
            onProgress?.({ current: completed, total, phase: 'generating' })
        }

        if (resultB) {
            evaluations[promptIndex].resultB = { ...resultB, status: resultB.error ? 'error' : 'complete' }
            completed += 1
            onProgress?.({ current: completed, total, phase: 'generating' })
        }

        if (resultA || resultB) {
            evaluations[promptIndex].judge = { status: 'pending', result: '', scores: null, elapsed: null }
            evaluations[promptIndex].screenshotA = null
            evaluations[promptIndex].screenshotB = null
        }
    })

    return evaluations
}
