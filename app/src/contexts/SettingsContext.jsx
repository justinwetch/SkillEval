/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'
import {
    DEFAULT_GENERATION_MODEL,
    DEFAULT_JUDGE_MODEL,
    getModelProvider,
    normalizeModelId,
    PROVIDERS,
} from '../utils/providers'

const SettingsContext = createContext(null)

const STORAGE_KEYS = {
    API_KEY: 'skill_eval_api_key',
    API_KEYS: 'skill_eval_api_keys',
    DEFAULT_CONFIG_MODEL: 'skill_eval_default_config_model',
    DEFAULT_GEN_MODEL: 'skill_eval_default_gen_model',
    DEFAULT_JUDGE_MODEL: 'skill_eval_default_judge_model',
    THEME: 'skill_eval_theme',
}

const DEFAULT_SETTINGS = {
    apiKeys: Object.fromEntries(Object.keys(PROVIDERS).map(provider => [provider, ''])),
    defaultGenModel: DEFAULT_GENERATION_MODEL,
    defaultJudgeModel: DEFAULT_JUDGE_MODEL,
    theme: 'dark',
}

function parseStoredApiKeys() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.API_KEYS)
        return stored ? JSON.parse(stored) : {}
    } catch (e) {
        console.warn('Failed to load saved API keys:', e)
        return {}
    }
}

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(() => {
        const savedApiKeys = parseStoredApiKeys()
        const legacyAnthropicKey = localStorage.getItem(STORAGE_KEYS.API_KEY) || ''
        const storedConfigModel = localStorage.getItem(STORAGE_KEYS.DEFAULT_CONFIG_MODEL)
        const storedGenModel = localStorage.getItem(STORAGE_KEYS.DEFAULT_GEN_MODEL)
        const storedJudgeModel = localStorage.getItem(STORAGE_KEYS.DEFAULT_JUDGE_MODEL)

        return {
            apiKeys: {
                ...DEFAULT_SETTINGS.apiKeys,
                ...savedApiKeys,
                anthropic: savedApiKeys.anthropic || legacyAnthropicKey,
            },
            defaultGenModel: normalizeModelId(storedGenModel || DEFAULT_SETTINGS.defaultGenModel),
            defaultJudgeModel: normalizeModelId(storedJudgeModel || storedConfigModel || DEFAULT_SETTINGS.defaultJudgeModel),
            theme: localStorage.getItem(STORAGE_KEYS.THEME) || DEFAULT_SETTINGS.theme,
        }
    })

    // Apply theme to document
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', settings.theme)
    }, [settings.theme])

    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(settings.apiKeys))
        localStorage.setItem(STORAGE_KEYS.API_KEY, settings.apiKeys.anthropic || '')
        localStorage.setItem(STORAGE_KEYS.DEFAULT_GEN_MODEL, settings.defaultGenModel)
        localStorage.setItem(STORAGE_KEYS.DEFAULT_JUDGE_MODEL, settings.defaultJudgeModel)
        localStorage.setItem(STORAGE_KEYS.THEME, settings.theme)
    }, [settings])

    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }))
    }

    const setApiKey = (provider, key) => {
        setSettings(prev => ({
            ...prev,
            apiKeys: {
                ...prev.apiKeys,
                [provider]: key,
            }
        }))
    }

    const toggleTheme = () => {
        updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')
    }

    const getApiKeyForProvider = (provider) => settings.apiKeys?.[provider] || ''

    const getApiKeyForModel = (model) => {
        const provider = getModelProvider(model)
        return getApiKeyForProvider(provider)
    }

    const hasApiKeyForProvider = (provider) => !!getApiKeyForProvider(provider)
    const hasApiKeyForModel = (model) => !!getApiKeyForModel(model)
    const needsApiKey = !Object.values(settings.apiKeys || {}).some(Boolean)

    return (
        <SettingsContext.Provider value={{
            settings,
            updateSetting,
            setApiKey,
            getApiKeyForProvider,
            getApiKeyForModel,
            hasApiKeyForProvider,
            hasApiKeyForModel,
            toggleTheme,
            needsApiKey,
        }}>
            {children}
        </SettingsContext.Provider>
    )
}

export function useSettings() {
    const context = useContext(SettingsContext)
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider')
    }
    return context
}
