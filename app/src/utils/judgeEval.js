/**
 * Judge a single evaluation - compare A vs B outputs
 */

import { callAnthropic } from './api';
import { buildJudgePrompt, parseJudgeResponse } from './buildJudgePrompt';
import { captureScreenshots } from './screenshot';

/**
 * Judge a single evaluation
 * @param {Object} options
 * @param {string} options.apiKey
 * @param {Object} options.evaluation - { prompt, resultA, resultB }
 * @param {Array} options.criteria - Criteria with rubrics
 * @param {string} options.outputType - 'text' | 'visual' | 'both'
 * @param {string} options.judgeModel - Model to use for judging
 * @param {Object} options.skillNames - { skillA, skillB } names for context
 * @returns {Promise<Object>} Judge result with scores
 */
export async function judgeSingleEval({
    apiKey,
    evaluation,
    criteria,
    outputType,
    judgeModel = 'claude-sonnet-4-5-20250929',
    skillNames = { skillA: 'Skill A', skillB: 'Skill B' }
}) {
    const startTime = Date.now();
    const isVisual = outputType === 'visual' || outputType === 'both';
    const includeCode = outputType === 'text' || outputType === 'both';

    try {
        // Capture screenshots if needed
        let screenshots = { screenshotA: null, screenshotB: null };
        if (isVisual) {
            screenshots = await captureScreenshots(
                evaluation.resultA.content,
                evaluation.resultB.content
            );
        }

        // Build the judge system prompt
        const systemPrompt = buildJudgePrompt(criteria, outputType);

        // Build message content
        const messageContent = [];

        // Add prompt context
        messageContent.push({
            type: 'text',
            text: `Here is the original user prompt:\n\n"${evaluation.prompt}"\n\n---\n\n## Result A (${skillNames.skillA})`
        });

        // Add screenshot A if available
        if (screenshots.screenshotA) {
            messageContent.push({
                type: 'text',
                text: '### Screenshot of Result A:'
            });
            messageContent.push({
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: 'image/png',
                    data: screenshots.screenshotA
                }
            });
        }

        // Add source code A if needed
        if (includeCode) {
            messageContent.push({
                type: 'text',
                text: `### Source of Result A:\n\n\`\`\`\n${evaluation.resultA.content}\n\`\`\``
            });
        }

        // Add Result B section
        messageContent.push({
            type: 'text',
            text: `\n\n---\n\n## Result B (${skillNames.skillB})`
        });

        // Add screenshot B if available
        if (screenshots.screenshotB) {
            messageContent.push({
                type: 'text',
                text: '### Screenshot of Result B:'
            });
            messageContent.push({
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: 'image/png',
                    data: screenshots.screenshotB
                }
            });
        }

        // Add source code B if needed
        if (includeCode) {
            messageContent.push({
                type: 'text',
                text: `### Source of Result B:\n\n\`\`\`\n${evaluation.resultB.content}\n\`\`\``
            });
        }

        // Add final instruction
        messageContent.push({
            type: 'text',
            text: isVisual && includeCode
                ? '\n\nPlease evaluate both outputs based on the screenshots and source content.'
                : isVisual
                    ? '\n\nPlease evaluate both outputs based on the screenshots above.'
                    : '\n\nPlease evaluate both outputs based on the content above.'
        });

        // Call the judge
        const response = await callAnthropic({
            apiKey,
            model: judgeModel,
            systemPrompt,
            messages: [{ role: 'user', content: messageContent }],
            maxTokens: 4096
        });

        const resultText = response.content?.[0]?.text || '';
        const scores = parseJudgeResponse(resultText);
        const elapsed = Date.now() - startTime;

        return {
            status: 'complete',
            result: resultText,
            scores,
            elapsed,
            screenshotA: screenshots.screenshotA,
            screenshotB: screenshots.screenshotB
        };

    } catch (error) {
        const elapsed = Date.now() - startTime;
        return {
            status: 'error',
            result: `Error: ${error.message}`,
            scores: null,
            elapsed,
            screenshotA: null,
            screenshotB: null
        };
    }
}

/**
 * Judge all evaluations in parallel
 * @param {Object} options
 * @param {string} options.apiKey
 * @param {Array} options.evaluations - Array of evaluations with results
 * @param {Array} options.criteria
 * @param {string} options.outputType
 * @param {string} options.judgeModel
 * @param {Object} options.skillNames
 * @param {Function} options.onProgress
 * @returns {Promise<Array>} Updated evaluations with judge results
 */
export async function judgeAllEvals({
    apiKey,
    evaluations,
    criteria,
    outputType,
    judgeModel,
    skillNames,
    onProgress
}) {
    const evalsToJudge = evaluations.filter(ev =>
        ev.resultA.status === 'complete' &&
        ev.resultB.status === 'complete' &&
        ev.judge.status !== 'complete'
    );

    const total = evalsToJudge.length;
    let completed = 0;

    const promises = evalsToJudge.map(async (ev, idx) => {
        const result = await judgeSingleEval({
            apiKey,
            evaluation: ev,
            criteria,
            outputType,
            judgeModel,
            skillNames
        });

        // Find the original evaluation and update it
        const originalIdx = evaluations.findIndex(e => e.id === ev.id);
        if (originalIdx >= 0) {
            evaluations[originalIdx].judge = result;
            evaluations[originalIdx].screenshotA = result.screenshotA;
            evaluations[originalIdx].screenshotB = result.screenshotB;
        }

        completed++;
        onProgress?.({ current: completed, total, phase: 'judging' });
    });

    await Promise.all(promises);

    return evaluations;
}
