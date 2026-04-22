/* eslint-disable react-refresh/only-export-components */
/**
 * Evaluation Configuration Context
 * Manages state for skill files, criteria, prompts, and generation
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { generateFromSkills, FALLBACK_CONFIG } from '../utils/generateConfig';
import { useSettings } from './SettingsContext';
import { useLlmHub } from './LlmHubContext';

const EvalConfigContext = createContext(null);

const STORAGE_KEY = 'skill_eval_current_config';

const DEFAULT_CONFIG = {
    skills: [],
    skillA: { filename: '', content: '' },
    skillB: { filename: '', content: '' },
    comparisonMode: 'baseline',
    outputType: 'text',
    outputTypeReasoning: '',
    criteria: [],
    prompts: [],
    promptCount: 5,
};

function createEmptySkill() {
    return { id: `skill_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, filename: '', content: '' };
}

export function normalizeSkills(config) {
    const rawSkills = Array.isArray(config?.skills) ? config.skills : [];
    const hasExplicitSkills = Array.isArray(config?.skills);
    const migratedSkills = hasExplicitSkills
        ? rawSkills
        : [config?.skillA, config?.skillB].filter((skill) => skill?.content);

    const skills = migratedSkills
        .filter((skill) => skill && (skill.filename || skill.content))
        .slice(0, 5)
        .map((skill) => ({
            id: skill.id || createEmptySkill().id,
            filename: skill.filename || '',
            content: skill.content || '',
        }));

    return skills;
}

export function syncLegacySkills(config) {
    const skills = normalizeSkills(config);
    return {
        ...DEFAULT_CONFIG,
        ...config,
        skills,
        skillA: skills[0] || { filename: '', content: '' },
        skillB: skills[1] || { filename: '', content: '' },
    };
}

export function EvalConfigProvider({ children }) {
    const { settings } = useSettings();
    const { adapter, defaultModel, models } = useLlmHub();
    const firstConnectedLanguageModel = models.find(
        (model) => model.connected && model.kind === 'language',
    );
    const fallbackModelSelection = defaultModel || (
        firstConnectedLanguageModel
            ? {
                providerId: firstConnectedLanguageModel.providerId,
                modelId: firstConnectedLanguageModel.modelId,
            }
            : null
    );

    // Load initial state from localStorage
    const [config, setConfig] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return syncLegacySkills(JSON.parse(saved));
            }
        } catch (e) {
            console.warn('Failed to load saved config:', e);
        }
        return syncLegacySkills(DEFAULT_CONFIG);
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState(null);
    const configuredSkills = normalizeSkills(config);

    // Persist config to localStorage
    const persistConfig = useCallback((newConfig) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
        } catch (e) {
            console.warn('Failed to persist config:', e);
        }
    }, []);

    // Update a single config field
    const updateConfig = useCallback((field, value) => {
        setConfig(prev => {
            const newConfig = syncLegacySkills({ ...prev, [field]: value });
            persistConfig(newConfig);
            return newConfig;
        });
    }, [persistConfig]);

    const replaceConfig = useCallback((nextConfig) => {
        const newConfig = syncLegacySkills({ ...DEFAULT_CONFIG, ...nextConfig });
        setConfig(newConfig);
        persistConfig(newConfig);
    }, [persistConfig]);

    // Set skill file
    const setSkill = useCallback((side, skill) => {
        const skillIndex = side === 'A' ? 0 : 1;
        setConfig((prev) => {
            const nextSkills = [...normalizeSkills(prev)];
            nextSkills[skillIndex] = {
                id: nextSkills[skillIndex]?.id || createEmptySkill().id,
                filename: skill?.filename || '',
                content: skill?.content || '',
            };
            const newConfig = syncLegacySkills({ ...prev, skills: nextSkills });
            persistConfig(newConfig);
            return newConfig;
        });
    }, [persistConfig]);

    const addSkill = useCallback((skill) => {
        setConfig((prev) => {
            const nextSkills = [...normalizeSkills(prev)];
            if (nextSkills.length >= 5) return prev;
            nextSkills.push({
                id: createEmptySkill().id,
                filename: skill?.filename || '',
                content: skill?.content || '',
            });
            const newConfig = syncLegacySkills({ ...prev, skills: nextSkills });
            persistConfig(newConfig);
            return newConfig;
        });
    }, [persistConfig]);

    const setComparisonMode = useCallback((comparisonMode) => {
        setConfig((prev) => {
            const normalizedSkills = normalizeSkills(prev);
            const nextSkills = comparisonMode === 'pairwise'
                ? normalizedSkills.slice(0, 2)
                : normalizedSkills;
            const newConfig = syncLegacySkills({
                ...prev,
                comparisonMode,
                skills: nextSkills,
            });
            persistConfig(newConfig);
            return newConfig;
        });
    }, [persistConfig]);

    const removeSkill = useCallback((index) => {
        setConfig((prev) => {
            const nextSkills = normalizeSkills(prev).filter((_, skillIndex) => skillIndex !== index);
            const newConfig = syncLegacySkills({ ...prev, skills: nextSkills });
            persistConfig(newConfig);
            return newConfig;
        });
    }, [persistConfig]);

    // Set output type
    const setOutputType = useCallback((outputType) => {
        updateConfig('outputType', outputType);
    }, [updateConfig]);

    // Set criteria
    const setCriteria = useCallback((criteria) => {
        updateConfig('criteria', criteria);
    }, [updateConfig]);

    // Update a single criterion
    const updateCriterion = useCallback((index, updates) => {
        setConfig(prev => {
            const newCriteria = [...prev.criteria];
            newCriteria[index] = { ...newCriteria[index], ...updates };
            const newConfig = { ...prev, criteria: newCriteria };
            persistConfig(newConfig);
            return newConfig;
        });
    }, [persistConfig]);

    // Remove a criterion
    const removeCriterion = useCallback((index) => {
        setConfig(prev => {
            const newCriteria = prev.criteria.filter((_, i) => i !== index);
            const newConfig = { ...prev, criteria: newCriteria };
            persistConfig(newConfig);
            return newConfig;
        });
    }, [persistConfig]);

    // Add a new criterion
    const addCriterion = useCallback((criterion) => {
        setConfig(prev => {
            const newCriteria = [...prev.criteria, {
                id: `criterion_${Date.now()}`,
                name: criterion?.name || 'New Criterion',
                description: criterion?.description || '',
                rubric: criterion?.rubric || {
                    '5': 'Excellent',
                    '4': 'Good',
                    '3': 'Acceptable',
                    '2': 'Poor',
                    '1': 'Unacceptable'
                }
            }];
            const newConfig = { ...prev, criteria: newCriteria };
            persistConfig(newConfig);
            return newConfig;
        });
    }, [persistConfig]);

    // Set prompts
    const setPrompts = useCallback((prompts) => {
        updateConfig('prompts', prompts);
    }, [updateConfig]);

    // Update a single prompt
    const updatePrompt = useCallback((index, text) => {
        setConfig(prev => {
            const newPrompts = [...prev.prompts];
            newPrompts[index] = text;
            const newConfig = { ...prev, prompts: newPrompts };
            persistConfig(newConfig);
            return newConfig;
        });
    }, [persistConfig]);

    // Remove a prompt
    const removePrompt = useCallback((index) => {
        setConfig(prev => {
            const newPrompts = prev.prompts.filter((_, i) => i !== index);
            const newConfig = { ...prev, prompts: newPrompts };
            persistConfig(newConfig);
            return newConfig;
        });
    }, [persistConfig]);

    // Add a new prompt
    const addPrompt = useCallback((text = '') => {
        setConfig(prev => {
            const newPrompts = [...prev.prompts, text];
            const newConfig = { ...prev, prompts: newPrompts };
            persistConfig(newConfig);
            return newConfig;
        });
    }, [persistConfig]);

    // Set prompt count
    const setPromptCount = useCallback((count) => {
        updateConfig('promptCount', count);
    }, [updateConfig]);

    // Generate all configuration from skills
    const generateAll = useCallback(async (bypassCache = false) => {
        if (configuredSkills.length < 2) {
            setGenerationError('At least two skill files are required');
            return false;
        }

        setIsGenerating(true);
        setGenerationError(null);

        try {
            const result = await generateFromSkills({
                adapter,
                modelSelection: settings.defaultConfigGenModel || fallbackModelSelection,
                skills: configuredSkills,
                comparisonMode: config.comparisonMode,
                generationType: 'all',
                promptCount: config.promptCount,
                bypassCache
            });

            if (result.generationError) {
                setGenerationError(result.generationError);
            }

            setConfig(prev => {
                const newConfig = {
                    ...prev,
                    outputType: result.outputType || prev.outputType,
                    outputTypeReasoning: result.outputTypeReasoning || '',
                    criteria: result.criteria?.length ? result.criteria : prev.criteria,
                    prompts: result.prompts?.length ? result.prompts : prev.prompts
                };
                persistConfig(newConfig);
                return newConfig;
            });

            return !result.generationError;
        } catch (error) {
            setGenerationError(error.message);
            return false;
        } finally {
            setIsGenerating(false);
        }
    }, [adapter, config.promptCount, configuredSkills, settings.defaultConfigGenModel, fallbackModelSelection, persistConfig]);

    // Regenerate just criteria
    const regenerateCriteria = useCallback(async () => {
        if (configuredSkills.length < 2) {
            setGenerationError('At least two skill files are required');
            return false;
        }

        setIsGenerating(true);
        setGenerationError(null);

        try {
            const result = await generateFromSkills({
                adapter,
                modelSelection: settings.defaultConfigGenModel || fallbackModelSelection,
                skills: configuredSkills,
                comparisonMode: config.comparisonMode,
                generationType: 'criteria',
                existingConfig: config,
                bypassCache: true
            });

            if (result.generationError) {
                setGenerationError(result.generationError);
            }

            if (result.criteria?.length) {
                setCriteria(result.criteria);
            }

            return !result.generationError;
        } catch (error) {
            setGenerationError(error.message);
            return false;
        } finally {
            setIsGenerating(false);
        }
    }, [adapter, config, configuredSkills, settings.defaultConfigGenModel, fallbackModelSelection, setCriteria]);

    // Regenerate just prompts
    const regeneratePrompts = useCallback(async () => {
        if (configuredSkills.length < 2) {
            setGenerationError('At least two skill files are required');
            return false;
        }

        setIsGenerating(true);
        setGenerationError(null);

        try {
            const result = await generateFromSkills({
                adapter,
                modelSelection: settings.defaultConfigGenModel || fallbackModelSelection,
                skills: configuredSkills,
                comparisonMode: config.comparisonMode,
                generationType: 'prompts',
                promptCount: config.promptCount,
                existingConfig: config,
                bypassCache: true
            });

            if (result.generationError) {
                setGenerationError(result.generationError);
            }

            if (result.prompts?.length) {
                setPrompts(result.prompts);
            }

            return !result.generationError;
        } catch (error) {
            setGenerationError(error.message);
            return false;
        } finally {
            setIsGenerating(false);
        }
    }, [adapter, config, configuredSkills, settings.defaultConfigGenModel, fallbackModelSelection, setPrompts]);

    // Clear all configuration
    const clearConfig = useCallback(() => {
        setConfig(syncLegacySkills(DEFAULT_CONFIG));
        localStorage.removeItem(STORAGE_KEY);
        setGenerationError(null);
    }, []);

    // Check if ready to evaluate
    const isReadyToEvaluate =
        configuredSkills.length >= 2 &&
        config.criteria.length > 0 &&
        config.prompts.length > 0;

    // Check if skills are loaded
    const hasSkills = configuredSkills.length >= 2;

    return (
        <EvalConfigContext.Provider value={{
            config,
            isGenerating,
            generationError,
            replaceConfig,
            setSkill,
            addSkill,
            removeSkill,
            setComparisonMode,
            setOutputType,
            setCriteria,
            updateCriterion,
            removeCriterion,
            addCriterion,
            setPrompts,
            updatePrompt,
            removePrompt,
            addPrompt,
            setPromptCount,
            generateAll,
            regenerateCriteria,
            regeneratePrompts,
            clearConfig,
            isReadyToEvaluate,
            hasSkills
        }}>
            {children}
        </EvalConfigContext.Provider>
    );
}

export function useEvalConfig() {
    const context = useContext(EvalConfigContext);
    if (!context) {
        throw new Error('useEvalConfig must be used within an EvalConfigProvider');
    }
    return context;
}
