/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'

const SettingsContext = createContext(null)

const DEFAULT_GEMINI_MODEL = {
    providerId: 'gemini',
    modelId: 'gemini-3.1-pro-preview',
}

const STORAGE_KEYS = {
    SETTINGS: 'skill_eval_settings',
    LEGACY_API_KEY: 'skill_eval_api_key',
    LEGACY_DEFAULT_GEN_MODEL: 'skill_eval_default_gen_model',
    LEGACY_DEFAULT_JUDGE_MODEL: 'skill_eval_default_judge_model',
    LEGACY_THEME: 'skill_eval_theme',
}

const DEFAULT_SETTINGS = {
    theme: 'dark',
    defaultConfigGenModel: DEFAULT_GEMINI_MODEL,
    defaultEvalModel: DEFAULT_GEMINI_MODEL,
    defaultJudgeModel: DEFAULT_GEMINI_MODEL,
}

function loadSettings() {
    const legacyTheme = localStorage.getItem(STORAGE_KEYS.LEGACY_THEME)
    try {
        const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS)
        const parsedSettings = rawSettings ? JSON.parse(rawSettings) : {}

        return {
            ...DEFAULT_SETTINGS,
            ...parsedSettings,
            theme: parsedSettings.theme || legacyTheme || DEFAULT_SETTINGS.theme,
        }
    } catch {
        return {
            ...DEFAULT_SETTINGS,
            theme: legacyTheme || DEFAULT_SETTINGS.theme,
        }
    }
}

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(loadSettings)

    // Apply theme to document
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', settings.theme)
    }, [settings.theme])

    // Persist host-app preferences only. Secrets live in llm-hub, not browser storage.
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
        localStorage.removeItem(STORAGE_KEYS.LEGACY_API_KEY)
        localStorage.removeItem(STORAGE_KEYS.LEGACY_DEFAULT_GEN_MODEL)
        localStorage.removeItem(STORAGE_KEYS.LEGACY_DEFAULT_JUDGE_MODEL)
        localStorage.setItem(STORAGE_KEYS.LEGACY_THEME, settings.theme)
    }, [settings])

    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }))
    }

    const toggleTheme = () => {
        updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')
    }

    return (
        <SettingsContext.Provider value={{
            settings,
            updateSetting,
            toggleTheme,
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
