/**
 * Extract and parse JSON from LLM text that may include markdown fences or prose.
 */

function extractBalancedJson(text) {
    const start = text.search(/[\[{]/);

    if (start === -1) {
        return null;
    }

    const stack = [];
    let inString = false;
    let escapeNext = false;

    for (let i = start; i < text.length; i++) {
        const char = text[i];

        if (escapeNext) {
            escapeNext = false;
            continue;
        }

        if (char === '\\') {
            escapeNext = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (inString) {
            continue;
        }

        if (char === '{' || char === '[') {
            stack.push(char);
            continue;
        }

        if (char === '}' || char === ']') {
            const expected = char === '}' ? '{' : '[';
            if (stack.at(-1) !== expected) {
                return null;
            }

            stack.pop();

            if (stack.length === 0) {
                return text.slice(start, i + 1);
            }
        }
    }

    return null;
}

function buildJsonCandidates(text) {
    const trimmed = text.trim();
    const candidates = [trimmed];

    const fenceMatches = trimmed.matchAll(/```(?:\s*json)?\s*([\s\S]*?)```/gi);
    for (const match of fenceMatches) {
        const candidate = match[1]?.trim();
        if (candidate) {
            candidates.push(candidate);
        }
    }

    if (trimmed.startsWith('```')) {
        const strippedFence = trimmed
            .replace(/^```[^\r\n]*\r?\n?/, '')
            .replace(/\r?\n?```$/, '')
            .trim();

        if (strippedFence) {
            candidates.push(strippedFence);
        }
    }

    const balancedJson = extractBalancedJson(trimmed);
    if (balancedJson) {
        candidates.push(balancedJson.trim());
    }

    return [...new Set(candidates.filter(Boolean))];
}

export function parseJsonFromText(text) {
    if (typeof text !== 'string' || !text.trim()) {
        throw new Error('Response did not contain text to parse as JSON');
    }

    let lastError = null;

    for (const candidate of buildJsonCandidates(text)) {
        try {
            return JSON.parse(candidate);
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('Failed to parse JSON from response text');
}
