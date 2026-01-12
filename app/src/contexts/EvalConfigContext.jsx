/**
 * Evaluation Configuration Context
 * Manages state for skill files, criteria, prompts, and generation
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { generateFromSkills, FALLBACK_CONFIG } from '../utils/generateConfig';
import { useSettings } from './SettingsContext';

const EvalConfigContext = createContext(null);

const STORAGE_KEY = 'skill_eval_current_config';

const DEFAULT_CONFIG = {
    skillA: { filename: '', content: '' },
    skillB: { filename: '', content: '' },
    outputType: 'text',
    outputTypeReasoning: '',
    criteria: [],
    prompts: [],
    promptCount: 50,
};

export function EvalConfigProvider({ children }) {
    const { settings } = useSettings();

    // Load initial state from localStorage
    const [config, setConfig] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('Failed to load saved config:', e);
        }
        return DEFAULT_CONFIG;
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState(null);

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
            const newConfig = { ...prev, [field]: value };
            persistConfig(newConfig);
            return newConfig;
        });
    }, [persistConfig]);

    // Set skill file
    const setSkill = useCallback((side, skill) => {
        const field = side === 'A' ? 'skillA' : 'skillB';
        updateConfig(field, skill);
    }, [updateConfig]);

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
        if (!config.skillA.content || !config.skillB.content) {
            setGenerationError('Both skill files are required');
            return false;
        }

        setIsGenerating(true);
        setGenerationError(null);

        try {
            const result = await generateFromSkills({
                apiKey: settings.apiKey,
                skillA: config.skillA,
                skillB: config.skillB,
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
    }, [config.skillA, config.skillB, config.promptCount, settings.apiKey, persistConfig]);

    // Regenerate just criteria
    const regenerateCriteria = useCallback(async () => {
        if (!config.skillA.content || !config.skillB.content) {
            setGenerationError('Both skill files are required');
            return false;
        }

        setIsGenerating(true);
        setGenerationError(null);

        try {
            const result = await generateFromSkills({
                apiKey: settings.apiKey,
                skillA: config.skillA,
                skillB: config.skillB,
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
    }, [config, settings.apiKey, setCriteria]);

    // Regenerate just prompts
    const regeneratePrompts = useCallback(async () => {
        if (!config.skillA.content || !config.skillB.content) {
            setGenerationError('Both skill files are required');
            return false;
        }

        setIsGenerating(true);
        setGenerationError(null);

        try {
            const result = await generateFromSkills({
                apiKey: settings.apiKey,
                skillA: config.skillA,
                skillB: config.skillB,
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
    }, [config, settings.apiKey, setPrompts]);

    // Clear all configuration
    const clearConfig = useCallback(() => {
        setConfig(DEFAULT_CONFIG);
        localStorage.removeItem(STORAGE_KEY);
        setGenerationError(null);
    }, []);

    // Check if ready to evaluate
    const isReadyToEvaluate =
        config.skillA.content &&
        config.skillB.content &&
        config.criteria.length > 0 &&
        config.prompts.length > 0;

    // Check if skills are loaded
    const hasSkills = config.skillA.content && config.skillB.content;

    return (
        <EvalConfigContext.Provider value={{
            config,
            isGenerating,
            generationError,
            setSkill,
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
