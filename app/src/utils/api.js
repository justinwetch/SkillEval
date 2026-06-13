import { getModelProvider, normalizeModelId, PROVIDERS, DEFAULT_GENERATION_MODEL } from './providers'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const XAI_RESPONSES_URL = 'https://api.x.ai/v1/responses'
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

function getApiKey({ apiKey, apiKeys, provider }) {
    return apiKey || apiKeys?.[provider] || ''
}

function assertApiKey(apiKey, provider) {
    if (!apiKey) {
        throw new Error(`${PROVIDERS[provider]?.label || provider} provider key is required`)
    }
}

function stripJsonCodeFence(text) {
    const match = text?.match(/```(?:json)?\s*([\s\S]*?)```/)
    return (match ? match[1] : text)?.trim()
}

function attachParsedJson(result, text, jsonMode) {
    if (!jsonMode || !text) return result

    try {
        return {
            ...result,
            parsed: JSON.parse(stripJsonCodeFence(text)),
        }
    } catch (parseError) {
        console.warn('Failed to parse JSON response:', parseError)
        return {
            ...result,
            parseError: parseError.message,
        }
    }
}

function normalizeContentParts(content) {
    if (typeof content === 'string') {
        return [{ type: 'text', text: content }]
    }

    if (!Array.isArray(content)) {
        return [{ type: 'text', text: String(content ?? '') }]
    }

    return content
}

function toOpenAIContent(content) {
    return normalizeContentParts(content).map(part => {
        if (part.type === 'image') {
            const source = part.source || {}
            const mediaType = source.media_type || source.mediaType || 'image/png'
            return {
                type: 'input_image',
                image_url: `data:${mediaType};base64,${source.data}`,
            }
        }

        return {
            type: 'input_text',
            text: part.text || '',
        }
    })
}

function toGeminiParts(content) {
    return normalizeContentParts(content).map(part => {
        if (part.type === 'image') {
            const source = part.source || {}
            return {
                inline_data: {
                    mime_type: source.media_type || source.mediaType || 'image/png',
                    data: source.data,
                },
            }
        }

        return { text: part.text || '' }
    })
}

function extractOpenAIText(data) {
    if (data.output_text) return data.output_text

    const output = data.output || []
    for (const item of output) {
        for (const content of item.content || []) {
            if (content.type === 'output_text' && content.text) return content.text
            if (content.text) return content.text
        }
    }

    return ''
}

function extractGeminiText(data) {
    return data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || '')
        .join('') || ''
}

async function parseErrorResponse(response) {
    const errorData = await response.json().catch(() => ({}))
    return errorData.error?.message ||
        errorData.message ||
        `API request failed with status ${response.status}`
}

export async function callAnthropic({
    apiKey,
    model = DEFAULT_GENERATION_MODEL,
    systemPrompt,
    messages,
    maxTokens = 8192,
    jsonMode = false,
}) {
    assertApiKey(apiKey, 'anthropic')

    const body = {
        model: normalizeModelId(model),
        max_tokens: maxTokens,
        messages,
    }

    if (systemPrompt) {
        body.system = systemPrompt
    }

    const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        throw new Error(await parseErrorResponse(response))
    }

    const data = await response.json()
    const text = extractText(data)
    return attachParsedJson(data, text, jsonMode)
}

export async function callOpenAI({
    apiKey,
    model = 'gpt-5.5',
    systemPrompt,
    messages,
    maxTokens = 8192,
    jsonMode = false,
}) {
    assertApiKey(apiKey, 'openai')

    return callResponsesApi({
        apiKey,
        model,
        systemPrompt,
        messages,
        maxTokens,
        jsonMode,
        url: OPENAI_RESPONSES_URL,
        provider: 'openai',
        systemRole: 'developer',
    })
}

export async function callXAI({
    apiKey,
    model = 'grok-4.3',
    systemPrompt,
    messages,
    maxTokens = 8192,
    jsonMode = false,
}) {
    assertApiKey(apiKey, 'xai')

    return callResponsesApi({
        apiKey,
        model,
        systemPrompt,
        messages,
        maxTokens,
        jsonMode,
        url: XAI_RESPONSES_URL,
        provider: 'xai',
        systemRole: 'system',
    })
}

async function callResponsesApi({
    apiKey,
    model,
    systemPrompt,
    messages,
    maxTokens,
    jsonMode,
    url,
    provider,
    systemRole,
}) {
    const input = []

    if (systemPrompt) {
        input.push({
            role: systemRole,
            content: systemPrompt,
        })
    }

    for (const message of messages) {
        input.push({
            role: message.role === 'assistant' ? 'assistant' : 'user',
            content: toOpenAIContent(message.content),
        })
    }

    const body = {
        model: normalizeModelId(model),
        input,
        max_output_tokens: maxTokens,
    }

    if (jsonMode) {
        body.text = { format: { type: 'json_object' } }
    }

    if (provider === 'xai') {
        body.store = false
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        const providerLabel = PROVIDERS[provider]?.label || provider
        throw new Error(`${providerLabel}: ${await parseErrorResponse(response)}`)
    }

    const data = await response.json()
    const text = extractOpenAIText(data)
    return attachParsedJson({ ...data, text }, text, jsonMode)
}

export async function callGemini({
    apiKey,
    model = 'gemini-3.5-flash',
    systemPrompt,
    messages,
    maxTokens = 8192,
    jsonMode = false,
}) {
    assertApiKey(apiKey, 'gemini')

    const body = {
        contents: messages.map(message => ({
            role: message.role === 'assistant' ? 'model' : 'user',
            parts: toGeminiParts(message.content),
        })),
        generationConfig: {
            maxOutputTokens: maxTokens,
        },
    }

    if (systemPrompt) {
        body.system_instruction = {
            parts: [{ text: systemPrompt }],
        }
    }

    if (jsonMode) {
        body.generationConfig.responseMimeType = 'application/json'
    }

    const response = await fetch(`${GEMINI_API_BASE_URL}/${normalizeModelId(model)}:generateContent`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        throw new Error(await parseErrorResponse(response))
    }

    const data = await response.json()
    const text = extractGeminiText(data)
    return attachParsedJson({ ...data, text }, text, jsonMode)
}

export async function callModel({
    provider,
    apiKey,
    apiKeys,
    model = DEFAULT_GENERATION_MODEL,
    ...options
}) {
    const normalizedModel = normalizeModelId(model)
    const resolvedProvider = provider || getModelProvider(normalizedModel)
    const resolvedApiKey = getApiKey({ apiKey, apiKeys, provider: resolvedProvider })

    if (resolvedProvider === 'openai') {
        return callOpenAI({ ...options, apiKey: resolvedApiKey, model: normalizedModel })
    }

    if (resolvedProvider === 'gemini') {
        return callGemini({ ...options, apiKey: resolvedApiKey, model: normalizedModel })
    }

    if (resolvedProvider === 'xai') {
        return callXAI({ ...options, apiKey: resolvedApiKey, model: normalizedModel })
    }

    return callAnthropic({ ...options, apiKey: resolvedApiKey, model: normalizedModel })
}

export function extractText(response) {
    if (response.text) return response.text
    if (response.output_text) return response.output_text
    if (response.content) return response.content?.find(c => c.type === 'text')?.text || ''
    if (response.candidates) return extractGeminiText(response)
    return ''
}
