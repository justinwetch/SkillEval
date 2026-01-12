import { createContext, useContext, useState, useEffect } from 'react'

const SettingsContext = createContext(null)

const STORAGE_KEYS = {
    API_KEY: 'skill_eval_api_key',
    DEFAULT_GEN_MODEL: 'skill_eval_default_gen_model',
    DEFAULT_JUDGE_MODEL: 'skill_eval_default_judge_model',
    THEME: 'skill_eval_theme',
}

const DEFAULT_SETTINGS = {
    apiKey: '',
    apiKeyValid: null, // null = unchecked, true/false = validated
    defaultGenModel: 'claude-sonnet-4-5-20250514',
    defaultJudgeModel: 'claude-opus-4-5-20250514',
    theme: 'dark',
}

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(() => {
        // Load from localStorage on init
        return {
            apiKey: localStorage.getItem(STORAGE_KEYS.API_KEY) || DEFAULT_SETTINGS.apiKey,
            apiKeyValid: null,
            defaultGenModel: localStorage.getItem(STORAGE_KEYS.DEFAULT_GEN_MODEL) || DEFAULT_SETTINGS.defaultGenModel,
            defaultJudgeModel: localStorage.getItem(STORAGE_KEYS.DEFAULT_JUDGE_MODEL) || DEFAULT_SETTINGS.defaultJudgeModel,
            theme: localStorage.getItem(STORAGE_KEYS.THEME) || DEFAULT_SETTINGS.theme,
        }
    })

    // Apply theme to document
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', settings.theme)
    }, [settings.theme])

    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.API_KEY, settings.apiKey)
        localStorage.setItem(STORAGE_KEYS.DEFAULT_GEN_MODEL, settings.defaultGenModel)
        localStorage.setItem(STORAGE_KEYS.DEFAULT_JUDGE_MODEL, settings.defaultJudgeModel)
        localStorage.setItem(STORAGE_KEYS.THEME, settings.theme)
    }, [settings])

    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }))
    }

    const setApiKey = (key) => {
        updateSetting('apiKey', key)
        updateSetting('apiKeyValid', null) // Reset validation when key changes
    }

    const setApiKeyValid = (valid) => {
        updateSetting('apiKeyValid', valid)
    }

    const toggleTheme = () => {
        updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')
    }

    const validateApiKey = async () => {
        if (!settings.apiKey) {
            setApiKeyValid(false)
            return false
        }

        try {
            // Make a minimal API call to validate the key
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': settings.apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true',
                },
                body: JSON.stringify({
                    model: 'claude-haiku-4-5-20250514',
                    max_tokens: 1,
                    messages: [{ role: 'user', content: 'Hi' }],
                }),
            })

            const valid = response.ok || response.status === 400 // 400 means key is valid but request may be malformed
            setApiKeyValid(valid)
            return valid
        } catch (error) {
            // Network error or CORS - key might still be valid
            // For browser-side, we'll assume valid if we get a response
            setApiKeyValid(false)
            return false
        }
    }

    const hasValidApiKey = settings.apiKey && settings.apiKeyValid === true
    const needsApiKey = !settings.apiKey || settings.apiKeyValid === false

    return (
        <SettingsContext.Provider value={{
            settings,
            updateSetting,
            setApiKey,
            setApiKeyValid,
            validateApiKey,
            toggleTheme,
            hasValidApiKey,
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
