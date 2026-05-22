export const PROVIDERS = {
    anthropic: {
        id: 'anthropic',
        label: 'Anthropic',
        keyLabel: 'Anthropic API Key',
        keyPlaceholder: 'sk-ant-api03-...',
        keyUrl: 'https://console.anthropic.com/settings/keys',
        keyHost: 'console.anthropic.com',
    },
    openai: {
        id: 'openai',
        label: 'OpenAI',
        keyLabel: 'OpenAI API Key',
        keyPlaceholder: 'sk-proj-...',
        keyUrl: 'https://platform.openai.com/api-keys',
        keyHost: 'platform.openai.com',
    },
    gemini: {
        id: 'gemini',
        label: 'Gemini',
        keyLabel: 'Gemini API Key',
        keyPlaceholder: 'AIza...',
        keyUrl: 'https://aistudio.google.com/app/apikey',
        keyHost: 'aistudio.google.com',
    },
}

export const MODELS = [
    {
        value: 'claude-haiku-4-5-20251001',
        label: 'Claude Haiku 4.5',
        provider: 'anthropic',
        speed: 'Fast',
    },
    {
        value: 'claude-sonnet-4-6',
        label: 'Claude Sonnet 4.6',
        provider: 'anthropic',
        speed: 'Balanced',
    },
    {
        value: 'claude-opus-4-7',
        label: 'Claude Opus 4.7',
        provider: 'anthropic',
        speed: 'Powerful',
    },
    {
        value: 'gpt-5.5',
        label: 'GPT-5.5',
        provider: 'openai',
        speed: 'Powerful',
    },
    {
        value: 'gpt-5.4',
        label: 'GPT-5.4',
        provider: 'openai',
        speed: 'Balanced',
    },
    {
        value: 'gpt-5.4-mini',
        label: 'GPT-5.4 Mini',
        provider: 'openai',
        speed: 'Fast',
    },
    {
        value: 'gpt-5.4-nano',
        label: 'GPT-5.4 Nano',
        provider: 'openai',
        speed: 'Fastest',
    },
    {
        value: 'gemini-3.1-pro-preview',
        label: 'Gemini 3.1 Pro Preview',
        provider: 'gemini',
        speed: 'Powerful',
    },
    {
        value: 'gemini-3.5-flash',
        label: 'Gemini 3.5 Flash',
        provider: 'gemini',
        speed: 'Balanced',
    },
    {
        value: 'gemini-2.5-pro',
        label: 'Gemini 2.5 Pro',
        provider: 'gemini',
        speed: 'Powerful',
    },
    {
        value: 'gemini-2.5-flash',
        label: 'Gemini 2.5 Flash',
        provider: 'gemini',
        speed: 'Fast',
    },
    {
        value: 'gemini-2.5-flash-lite',
        label: 'Gemini 2.5 Flash-Lite',
        provider: 'gemini',
        speed: 'Fastest',
    },
]

export const DEFAULT_GENERATION_MODEL = 'claude-sonnet-4-6'
export const DEFAULT_JUDGE_MODEL = 'claude-opus-4-7'

const MODEL_MIGRATIONS = {
    'claude-sonnet-4-6-20260217': 'claude-sonnet-4-6',
    'claude-opus-4-6-20260205': 'claude-opus-4-7',
    'claude-sonnet-4-5-20250929': 'claude-sonnet-4-6',
    'claude-opus-4-5-20251101': 'claude-opus-4-7',
}

export function normalizeModelId(model) {
    return MODEL_MIGRATIONS[model] || model
}

export function getModel(model) {
    const normalized = normalizeModelId(model)
    return MODELS.find(item => item.value === normalized) || null
}

export function inferProviderFromModel(model) {
    const normalized = normalizeModelId(model || '')

    if (normalized.startsWith('claude-')) return 'anthropic'
    if (normalized.startsWith('gpt-') || normalized.startsWith('o')) return 'openai'
    if (normalized.startsWith('gemini-')) return 'gemini'

    return null
}

export function getModelProvider(model) {
    return getModel(model)?.provider || inferProviderFromModel(model) || 'anthropic'
}

export function getModelsByProvider() {
    return Object.values(PROVIDERS).map(provider => ({
        provider,
        models: MODELS.filter(model => model.provider === provider.id),
    }))
}

export function getModelLabel(model) {
    const item = getModel(model)
    if (!item) return model
    return `${item.label} (${PROVIDERS[item.provider].label})`
}

export function getProviderLabelForModel(model) {
    const provider = getModelProvider(model)
    return PROVIDERS[provider]?.label || provider
}
