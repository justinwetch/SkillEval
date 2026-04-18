import { chatWithModel } from './llmHubClient'
import { runWithConcurrency } from './concurrency'

export async function runSingleEval({
    adapter,
    modelSelection,
    skillContent,
    baseSystemPrompt = '',
    prompt,
    maxTokens = 8192,
}) {
    const startTime = Date.now()
    const systemPrompt = baseSystemPrompt
        ? `${baseSystemPrompt}\n\n${skillContent}`
        : skillContent

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
    maxTokens = 8192,
    baseSystemPrompt = '',
    onProgress,
}) {
    const total = prompts.length * 2
    let completed = 0
    const evaluations = prompts.map((prompt, idx) => ({
        id: idx + 1,
        prompt,
        resultA: { content: '', error: null, elapsed: null, status: 'pending' },
        resultB: { content: '', error: null, elapsed: null, status: 'pending' },
        screenshotA: null,
        screenshotB: null,
        judge: { status: 'pending', result: '', scores: null, elapsed: null },
    }))

    await runWithConcurrency(prompts, 3, async (prompt, index) => {
        const [resultA, resultB] = await Promise.all([
            runSingleEval({
                adapter,
                modelSelection,
                skillContent: skillA.content,
                baseSystemPrompt,
                prompt,
                maxTokens,
            }),
            runSingleEval({
                adapter,
                modelSelection,
                skillContent: skillB.content,
                baseSystemPrompt,
                prompt,
                maxTokens,
            }),
        ])

        evaluations[index].resultA = { ...resultA, status: resultA.error ? 'error' : 'complete' }
        completed += 1
        onProgress?.({ current: completed, total, phase: 'generating' })

        evaluations[index].resultB = { ...resultB, status: resultB.error ? 'error' : 'complete' }
        completed += 1
        onProgress?.({ current: completed, total, phase: 'generating' })
    })

    return evaluations
}
