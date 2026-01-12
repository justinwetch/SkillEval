/**
 * Auto-generation service for evaluation configuration
 * Analyzes skill files and generates criteria, prompts, and output type
 */

import { callAnthropic } from './api';
import { getSkillHash, getCachedConfig, setCachedConfig } from './cache';

const GENERATION_MODEL = 'claude-sonnet-4-20250514';

const SYSTEM_PROMPT = `You are a configuration generator for an AI skill evaluation tool.

Given two skill files that will be compared against each other, analyze them and generate appropriate evaluation configuration.

Your task is to understand:
1. What domain/task the skills are designed for
2. What kind of output the skills will produce
3. What criteria would fairly evaluate their outputs
4. What prompts would effectively test their capabilities

## Output Type Inference

Analyze the skill to determine output type:
- "visual" if skills produce HTML/CSS, UI components, or visual artifacts
- "text" if skills produce code, text, data, or non-visual outputs  
- "both" if outputs benefit from seeing both rendered result AND source

## Criteria Generation Guidelines

Generate 4-6 criteria that:
- Are specific to what these skills claim to do
- Can be objectively evaluated (not vague)
- Cover different aspects (correctness, quality, style, edge cases)
- Each have a clear 1-5 scoring rubric

## Prompt Generation Guidelines

Generate the requested number of prompts that:
- Actually test what the skills claim to do
- Vary in difficulty (roughly 20% easy, 60% medium, 20% hard)
- Cover different aspects mentioned in the skills
- Are realistic user requests, not artificial tests
- Include edge cases and challenging scenarios

## Output Format

You MUST respond with valid JSON in this exact structure:
{
  "outputType": "text" | "visual" | "both",
  "outputTypeReasoning": "Brief explanation of why this output type was chosen",
  "criteria": [
    {
      "id": "snake_case_id",
      "name": "Human Readable Name",
      "description": "What this criterion measures",
      "rubric": {
        "5": "Description of excellent (5/5)",
        "4": "Description of good (4/5)",
        "3": "Description of acceptable (3/5)",
        "2": "Description of poor (2/5)",
        "1": "Description of unacceptable (1/5)"
      }
    }
  ],
  "prompts": ["Prompt 1", "Prompt 2", ...]
}`;

const FEW_SHOT_EXAMPLE = `
## Example Output (for a frontend design skill)

This shows the expected format. Adapt criteria and prompts to match the actual skill domain:

{
  "outputType": "visual",
  "outputTypeReasoning": "Skills produce HTML/CSS components that should be visually evaluated",
  "criteria": [
    {
      "id": "prompt_adherence",
      "name": "Prompt Adherence",
      "description": "How well does the output match what was requested?",
      "rubric": {
        "5": "Perfectly matches all requirements with thoughtful extras",
        "4": "Matches all explicit requirements",
        "3": "Matches most requirements, minor omissions",
        "2": "Partial match, significant gaps",
        "1": "Does not address the prompt"
      }
    },
    {
      "id": "visual_polish",
      "name": "Visual Polish",
      "description": "Quality of typography, spacing, color, and visual details",
      "rubric": {
        "5": "Premium, refined visual execution",
        "4": "Clean and professional",
        "3": "Acceptable but generic",
        "2": "Noticeable visual issues",
        "1": "Poor or broken visual presentation"
      }
    },
    {
      "id": "code_quality",
      "name": "Code Quality",
      "description": "Clean, semantic HTML/CSS, proper structure",
      "rubric": {
        "5": "Exemplary code organization and semantics",
        "4": "Good code quality",
        "3": "Functional but messy",
        "2": "Poor organization or practices",
        "1": "Broken or unmaintainable code"
      }
    }
  ],
  "prompts": [
    "Build a responsive landing page for a SaaS product that helps teams track OKRs",
    "Create a dark mode toggle component with smooth transitions",
    "Design an accessible contact form with validation feedback",
    "Build a pricing table with three tiers and a toggle for monthly/annual"
  ]
}`;

/**
 * Default fallback configuration when generation fails
 */
const FALLBACK_CONFIG = {
    outputType: 'text',
    outputTypeReasoning: 'Default fallback - unable to determine from skills',
    criteria: [
        {
            id: 'correctness',
            name: 'Correctness',
            description: 'Does the output correctly fulfill the request?',
            rubric: {
                '5': 'Perfectly correct with no errors',
                '4': 'Mostly correct with minor issues',
                '3': 'Partially correct',
                '2': 'Significant errors present',
                '1': 'Fundamentally incorrect'
            }
        },
        {
            id: 'quality',
            name: 'Quality',
            description: 'Overall quality of the output',
            rubric: {
                '5': 'Exceptional quality',
                '4': 'Good quality',
                '3': 'Acceptable quality',
                '2': 'Below average quality',
                '1': 'Poor quality'
            }
        },
        {
            id: 'completeness',
            name: 'Completeness',
            description: 'How complete and thorough is the output?',
            rubric: {
                '5': 'Thoroughly complete with extras',
                '4': 'Complete',
                '3': 'Mostly complete',
                '2': 'Incomplete',
                '1': 'Severely incomplete'
            }
        }
    ],
    prompts: []
};

/**
 * Validate generated configuration structure
 * @param {Object} config - Generated config to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateConfig(config) {
    const errors = [];

    if (!config || typeof config !== 'object') {
        return { valid: false, errors: ['Config must be an object'] };
    }

    // Validate outputType
    if (!['text', 'visual', 'both'].includes(config.outputType)) {
        errors.push(`Invalid outputType: ${config.outputType}`);
    }

    // Validate criteria
    if (!Array.isArray(config.criteria)) {
        errors.push('criteria must be an array');
    } else {
        config.criteria.forEach((c, i) => {
            if (!c.id || !c.name || !c.description) {
                errors.push(`Criterion ${i} missing required fields`);
            }
            if (!c.rubric || typeof c.rubric !== 'object') {
                errors.push(`Criterion ${i} missing rubric`);
            } else {
                const levels = Object.keys(c.rubric);
                if (levels.length !== 5) {
                    errors.push(`Criterion ${i} rubric should have 5 levels`);
                }
            }
        });
    }

    // Validate prompts
    if (!Array.isArray(config.prompts)) {
        errors.push('prompts must be an array');
    } else {
        config.prompts.forEach((p, i) => {
            if (typeof p !== 'string' || !p.trim()) {
                errors.push(`Prompt ${i} must be a non-empty string`);
            }
        });
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Generate evaluation configuration from skill files
 * @param {Object} options
 * @param {string} options.apiKey - Anthropic API key
 * @param {Object} options.skillA - { filename, content }
 * @param {Object} options.skillB - { filename, content }
 * @param {string} options.generationType - 'all' | 'criteria' | 'prompts' | 'outputType'
 * @param {number} options.promptCount - Number of prompts to generate (default 50)
 * @param {boolean} options.bypassCache - Force regeneration even if cached
 * @param {Object} options.existingConfig - Existing config to preserve when regenerating partial
 * @returns {Promise<Object>} Generated configuration
 */
export async function generateFromSkills({
    apiKey,
    skillA,
    skillB,
    generationType = 'all',
    promptCount = 50,
    bypassCache = false,
    existingConfig = null
}) {
    if (!skillA?.content || !skillB?.content) {
        throw new Error('Both skill files are required');
    }

    // Check cache first (only for 'all' generation type)
    if (generationType === 'all' && !bypassCache) {
        const hash = await getSkillHash(skillA, skillB);
        const cached = getCachedConfig(hash);
        if (cached) {
            console.log('Using cached configuration');
            return { ...cached, fromCache: true };
        }
    }

    // Build user message with skill contents
    let userMessage = `Please analyze these two skill files and generate evaluation configuration.

## Skill A: ${skillA.filename || 'skill-a.md'}

\`\`\`
${skillA.content}
\`\`\`

## Skill B: ${skillB.filename || 'skill-b.md'}

\`\`\`
${skillB.content}
\`\`\`

`;

    // Add generation-specific instructions
    if (generationType === 'all') {
        userMessage += `Generate a complete configuration with:
- Output type (text/visual/both)
- 4-6 evaluation criteria with rubrics
- ${promptCount} test prompts

${FEW_SHOT_EXAMPLE}`;
    } else if (generationType === 'criteria') {
        userMessage += `Generate only the evaluation criteria (4-6 criteria with rubrics).
Keep outputType as: ${existingConfig?.outputType || 'text'}
Do not generate prompts, use empty array.`;
    } else if (generationType === 'prompts') {
        userMessage += `Generate only ${promptCount} test prompts.
Keep outputType as: ${existingConfig?.outputType || 'text'}
Do not generate criteria, use empty array.`;
    } else if (generationType === 'outputType') {
        userMessage += `Determine only the appropriate output type (text/visual/both).
Do not generate criteria or prompts, use empty arrays.`;
    }

    try {
        const response = await callAnthropic({
            apiKey,
            model: GENERATION_MODEL,
            systemPrompt: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userMessage }],
            maxTokens: 8192,
            jsonMode: true
        });

        if (response.parseError) {
            console.error('JSON parse error:', response.parseError);
            throw new Error('Failed to parse generated configuration');
        }

        const generated = response.parsed;

        // Validate the generated config
        const { valid, errors } = validateConfig(generated);
        if (!valid) {
            console.warn('Generated config validation errors:', errors);
            // Try to use what we can, fill in with fallbacks
        }

        // Merge with existing config if partially regenerating
        let finalConfig = generated;
        if (existingConfig && generationType !== 'all') {
            finalConfig = {
                outputType: generationType === 'outputType' ? generated.outputType : existingConfig.outputType,
                outputTypeReasoning: generated.outputTypeReasoning || existingConfig.outputTypeReasoning,
                criteria: generationType === 'criteria' ? generated.criteria : existingConfig.criteria,
                prompts: generationType === 'prompts' ? generated.prompts : existingConfig.prompts
            };
        }

        // Cache the result (only for 'all' generation)
        if (generationType === 'all') {
            const hash = await getSkillHash(skillA, skillB);
            setCachedConfig(hash, finalConfig);
        }

        return { ...finalConfig, fromCache: false };

    } catch (error) {
        console.error('Generation failed:', error);

        // Return fallback config with error info
        return {
            ...FALLBACK_CONFIG,
            generationError: error.message,
            fromCache: false
        };
    }
}

export { FALLBACK_CONFIG };
