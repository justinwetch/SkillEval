/**
 * Run a single evaluation - call API with skill as system prompt
 */

import { callAnthropic } from './api';

/**
 * Run a single evaluation
 * @param {Object} options
 * @param {string} options.apiKey - Anthropic API key
 * @param {string} options.skillContent - Skill file content to use as system prompt addition
 * @param {string} options.baseSystemPrompt - Optional base system prompt
 * @param {string} options.prompt - User prompt to evaluate
 * @param {string} options.model - Model to use for generation
 * @param {number} options.maxTokens - Max tokens for response
 * @returns {Promise<{content: string, error: string|null, elapsed: number}>}
 */
export async function runSingleEval({
    apiKey,
    skillContent,
    baseSystemPrompt = '',
    prompt,
    model = 'claude-sonnet-4-5-20250929',
    maxTokens = 8192
}) {
    const startTime = Date.now();

    // Combine base system prompt with skill content
    const systemPrompt = baseSystemPrompt
        ? `${baseSystemPrompt}\n\n${skillContent}`
        : skillContent;

    try {
        const response = await callAnthropic({
            apiKey,
            model,
            systemPrompt,
            messages: [{ role: 'user', content: prompt }],
            maxTokens
        });

        const content = response.content?.[0]?.text || '';
        const elapsed = Date.now() - startTime;

        return { content, error: null, elapsed };
    } catch (error) {
        const elapsed = Date.now() - startTime;
        return { content: '', error: error.message, elapsed };
    }
}

/**
 * Run all evaluations for all prompts, both skills in parallel
 * @param {Object} options
 * @param {string} options.apiKey
 * @param {Object} options.skillA - { content }
 * @param {Object} options.skillB - { content }
 * @param {string[]} options.prompts
 * @param {string} options.model
 * @param {number} options.maxTokens
 * @param {string} options.baseSystemPrompt
 * @param {Function} options.onProgress - Called with { current, total, phase }
 * @returns {Promise<Array>} Array of evaluation results
 */
export async function runAllEvals({
    apiKey,
    skillA,
    skillB,
    prompts,
    model = 'claude-sonnet-4-5-20250929',
    maxTokens = 8192,
    baseSystemPrompt = '',
    onProgress
}) {
    const total = prompts.length * 2; // Both A and B for each prompt
    let completed = 0;

    const evaluations = prompts.map((prompt, idx) => ({
        id: idx + 1,
        prompt,
        resultA: { content: '', error: null, elapsed: null, status: 'pending' },
        resultB: { content: '', error: null, elapsed: null, status: 'pending' },
        screenshotA: null,
        screenshotB: null,
        judge: { status: 'pending', result: '', scores: null, elapsed: null }
    }));

    // Run all in parallel
    const promises = [];

    for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];

        // Run Skill A
        promises.push(
            runSingleEval({
                apiKey,
                skillContent: skillA.content,
                baseSystemPrompt,
                prompt,
                model,
                maxTokens
            }).then(result => {
                evaluations[i].resultA = { ...result, status: result.error ? 'error' : 'complete' };
                completed++;
                onProgress?.({ current: completed, total, phase: 'generating' });
            })
        );

        // Run Skill B
        promises.push(
            runSingleEval({
                apiKey,
                skillContent: skillB.content,
                baseSystemPrompt,
                prompt,
                model,
                maxTokens
            }).then(result => {
                evaluations[i].resultB = { ...result, status: result.error ? 'error' : 'complete' };
                completed++;
                onProgress?.({ current: completed, total, phase: 'generating' });
            })
        );
    }

    await Promise.all(promises);

    return evaluations;
}
