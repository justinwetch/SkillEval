/**
 * Run a single evaluation - call API with skill as system prompt
 */

import { callModel, extractText } from './api';
import { DEFAULT_GENERATION_MODEL } from './providers';
import { buildSkillPackageParts, isSkillReady } from './skillPackage';

/**
 * Run a single evaluation
 * @param {Object} options
 * @param {Object} options.apiKeys - API keys keyed by provider
 * @param {Object} options.skill - Agent Skill package to use for this evaluation
 * @param {string} options.baseSystemPrompt - Optional base system prompt
 * @param {string} options.prompt - User prompt to evaluate
 * @param {string} options.model - Model to use for generation
 * @param {number} options.maxTokens - Max tokens for response
 * @returns {Promise<{content: string, error: string|null, elapsed: number}>}
 */
export async function runSingleEval({
    apiKey,
    apiKeys,
    skill,
    baseSystemPrompt = '',
    prompt,
    model = DEFAULT_GENERATION_MODEL,
    maxTokens = 8192
}) {
    const startTime = Date.now();

    if (!isSkillReady(skill)) {
        return { content: '', error: 'Valid Agent Skill package is required', elapsed: Date.now() - startTime };
    }

    const systemPrompt = [
        baseSystemPrompt,
        'You are evaluating an Agent Skill package. Follow SKILL.md as the package entrypoint. Treat each referenced file path as a separate file in the skill package, and use supporting references, scripts, assets, and templates when they are relevant to the user request. If scripts are present, reason from their source unless an execution environment is explicitly available.',
    ].filter(Boolean).join('\n\n');

    const messageContent = [
        ...buildSkillPackageParts(skill, 'Active Skill Package'),
        {
            type: 'text',
            text: `\n## User Request\n${prompt}`,
        },
    ];

    try {
        const response = await callModel({
            apiKey,
            apiKeys,
            model,
            systemPrompt,
            messages: [{ role: 'user', content: messageContent }],
            maxTokens
        });

        const content = extractText(response);
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
 * @param {Object} options.apiKeys
 * @param {Object} options.skillA - Agent Skill package
 * @param {Object} options.skillB - Agent Skill package
 * @param {string[]} options.prompts
 * @param {string} options.model
 * @param {number} options.maxTokens
 * @param {string} options.baseSystemPrompt
 * @param {Function} options.onProgress - Called with { current, total, phase }
 * @returns {Promise<Array>} Array of evaluation results
 */
export async function runAllEvals({
    apiKey,
    apiKeys,
    skillA,
    skillB,
    prompts,
    model = DEFAULT_GENERATION_MODEL,
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
                apiKeys,
                skill: skillA,
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
                apiKeys,
                skill: skillB,
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
