/**
 * Build dynamic judge prompt from configured criteria
 */

/**
 * Build the system prompt for the judge based on configured criteria
 * @param {Array} criteria - Array of criterion objects with id, name, description, rubric
 * @param {string} outputType - 'text' | 'visual' | 'both'
 * @returns {string} Complete judge system prompt
 */
export function buildJudgePrompt(criteria, outputType) {
    const isVisual = outputType === 'visual' || outputType === 'both';
    const includeCode = outputType === 'text' || outputType === 'both';

    let prompt = `You are an expert evaluator comparing two AI-generated outputs. You will receive:
1. The original user prompt that both were given
`;

    if (isVisual) {
        prompt += `2. A SCREENSHOT of Result A showing the rendered visual output
3. A SCREENSHOT of Result B showing the rendered visual output
`;
    }

    if (includeCode) {
        prompt += `${isVisual ? '4' : '2'}. The source content/code of both results
`;
    }

    prompt += `
${isVisual ? 'IMPORTANT: Base your visual assessments primarily on the SCREENSHOTS, not just the code. The screenshots show exactly how the output renders.' : ''}

Rate each criterion from 1-5 and provide a brief justification.

`;

    // Add each criterion with its rubric
    criteria.forEach((criterion, index) => {
        prompt += `### ${index + 1}. ${criterion.name} (1-5)
${criterion.description}
`;
        if (criterion.rubric) {
            // Show key rubric points (5, 3, 1 for brevity)
            if (criterion.rubric['5']) prompt += `- 5: ${criterion.rubric['5']}\n`;
            if (criterion.rubric['3']) prompt += `- 3: ${criterion.rubric['3']}\n`;
            if (criterion.rubric['1']) prompt += `- 1: ${criterion.rubric['1']}\n`;
        }
        prompt += '\n';
    });

    // Build the scoring table header
    const criteriaHeaders = criteria.map(c => c.name).join(' | ');
    const scoreColumns = criteria.map(() => 'X/5').join(' | ');

    // Build breakdown JSON structure
    const breakdownFields = criteria.map(c =>
        `    "${c.id}": {"A": X, "B": X}`
    ).join(',\n');

    prompt += `## Required Output Format

### First Impressions
**Result A**: [2-3 sentence impression]
**Result B**: [2-3 sentence impression]

### Scores

| Criterion | Result A | Result B |
|-----------|----------|----------|
${criteria.map(c => `| ${c.name} | X/5 | X/5 |`).join('\n')}
| **TOTAL** | XX/${criteria.length * 5} | XX/${criteria.length * 5} |

### Winner
**[A or B]** - [Brief justification in 1-2 sentences]

### JSON Summary
\`\`\`json
{
  "winner": "A" or "B",
  "scoreA": XX,
  "scoreB": XX,
  "breakdown": {
${breakdownFields}
  }
}
\`\`\``;

    return prompt;
}

/**
 * Parse the judge's response to extract structured scores
 * @param {string} response - Raw judge response text
 * @returns {Object|null} Parsed scores or null if parsing failed
 */
export function parseJudgeResponse(response) {
    if (!response) return null;

    // Try to extract JSON block
    const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[1].trim());
        } catch (e) {
            console.warn('Failed to parse judge JSON:', e);
        }
    }

    // Fallback: try to parse winner from text
    const winnerMatch = response.match(/\*\*\[(A|B)\]\*\*/);
    if (winnerMatch) {
        return { winner: winnerMatch[1], scoreA: null, scoreB: null, breakdown: null };
    }

    return null;
}
