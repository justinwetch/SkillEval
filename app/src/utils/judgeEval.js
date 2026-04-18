import { chatWithModel } from './llmHubClient'
import { buildJudgePrompt, parseJudgeResponse } from './buildJudgePrompt'
import { buildJudgeMessages } from './buildJudgeMessages'
import { runWithConcurrency } from './concurrency'
import { captureScreenshots } from './screenshot'

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
    skillNames,
    onProgress,
}) {
    const evalsToJudge = evaluations.filter(ev =>
        ev.resultA.status === 'complete' &&
        ev.resultB.status === 'complete' &&
        ev.judge.status !== 'complete',
    )
    const total = evalsToJudge.length
    let completed = 0

    await runWithConcurrency(evalsToJudge, 3, async (ev) => {
        const result = await judgeSingleEval({
            adapter,
            modelSelection,
            evaluation: ev,
            criteria,
            outputType,
            skillNames,
        })

        const originalIdx = evaluations.findIndex(e => e.id === ev.id)
        if (originalIdx >= 0) {
            evaluations[originalIdx].judge = result
            evaluations[originalIdx].screenshotA = result.screenshotA
            evaluations[originalIdx].screenshotB = result.screenshotB
        }

        completed += 1
        onProgress?.({ current: completed, total, phase: 'judging' })
    })

    return evaluations
}
