/**
 * Anthropic API client wrapper for browser-side usage
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Call the Anthropic API
 * @param {Object} options
 * @param {string} options.apiKey - Anthropic API key
 * @param {string} options.model - Model to use (e.g., 'claude-sonnet-4-20250514')
 * @param {string} options.systemPrompt - System prompt
 * @param {Array} options.messages - Array of {role, content} messages
 * @param {number} options.maxTokens - Max tokens for response (default 8192)
 * @param {boolean} options.jsonMode - Request JSON output format
 * @returns {Promise<Object>} API response
 */
export async function callAnthropic({
    apiKey,
    model = 'claude-sonnet-4-20250514',
    systemPrompt,
    messages,
    maxTokens = 8192,
    jsonMode = false
}) {
    if (!apiKey) {
        throw new Error('API key is required');
    }

    const headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
    };

    const body = {
        model,
        max_tokens: maxTokens,
        messages,
    };

    if (systemPrompt) {
        body.system = systemPrompt;
    }

    // Note: Anthropic doesn't have a direct json_mode like OpenAI,
    // but we can instruct the model in the system prompt
    // The model will be instructed to output JSON in the system prompt

    try {
        const response = await fetch(ANTHROPIC_API_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message ||
                `API request failed with status ${response.status}`
            );
        }

        const data = await response.json();

        // Extract text content from response
        const textContent = data.content?.find(c => c.type === 'text')?.text;

        if (jsonMode && textContent) {
            try {
                // Try to parse as JSON, handling potential markdown code blocks
                let jsonStr = textContent;

                // Remove markdown code blocks if present
                const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
                if (jsonMatch) {
                    jsonStr = jsonMatch[1];
                }

                return {
                    ...data,
                    parsed: JSON.parse(jsonStr.trim())
                };
            } catch (parseError) {
                console.warn('Failed to parse JSON response:', parseError);
                return {
                    ...data,
                    parseError: parseError.message
                };
            }
        }

        return data;
    } catch (error) {
        console.error('Anthropic API error:', error);
        throw error;
    }
}

/**
 * Extract text content from an Anthropic API response
 * @param {Object} response - API response
 * @returns {string} Extracted text
 */
export function extractText(response) {
    return response.content?.find(c => c.type === 'text')?.text || '';
}
