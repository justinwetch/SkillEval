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
    defaultGenModel: 'claude-sonnet-4-5-20250929',
    defaultJudgeModel: 'claude-opus-4-5-20251101',
    theme: 'dark',
}

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(() => {
        // Load from localStorage on init
        return {
            apiKey: localStorage.getItem(STORAGE_KEYS.API_KEY) || DEFAULT_SETTINGS.apiKey,
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
    }

    const toggleTheme = () => {
        updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')
    }

    // Simple check - just see if key exists
    const needsApiKey = !settings.apiKey

    return (
        <SettingsContext.Provider value={{
            settings,
            updateSetting,
            setApiKey,
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
