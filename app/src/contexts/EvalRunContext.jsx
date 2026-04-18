/* eslint-disable react-refresh/only-export-components */
/**
 * Evaluation Run Context
 * Manages state for active evaluation runs (generation, judging, results)
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { runAllEvals } from '../utils/runEval';
import { judgeAllEvals } from '../utils/judgeEval';
import { useSettings } from './SettingsContext';
import { useEvalConfig } from './EvalConfigContext';
import { useLlmHub } from './LlmHubContext';

const EvalRunContext = createContext(null);

const STORAGE_KEY = 'skill_eval_run_state';

export function EvalRunProvider({ children }) {
    const { settings } = useSettings();
    const { config } = useEvalConfig();
    const { adapter, connectedProviders, defaultModel, models } = useLlmHub();
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

    // Evaluation run state
    const [evaluations, setEvaluations] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.warn('Failed to load saved evaluations:', e);
        }
        return [];
    });

    const [runStatus, setRunStatus] = useState('idle'); // idle, generating, judging, complete
    const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });
    const [runError, setRunError] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [endTime, setEndTime] = useState(null);

    // Persist evaluations
    const persistEvaluations = useCallback((evals) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(evals));
        } catch (e) {
            console.warn('Failed to persist evaluations:', e);
        }
    }, []);

    // Initialize evaluations from prompts
    const initializeEvaluations = useCallback(() => {
        const evals = config.prompts.map((prompt, idx) => ({
            id: idx + 1,
            prompt,
            resultA: { content: '', error: null, elapsed: null, status: 'pending' },
            resultB: { content: '', error: null, elapsed: null, status: 'pending' },
            screenshotA: null,
            screenshotB: null,
            judge: { status: 'pending', result: '', scores: null, elapsed: null }
        }));
        setEvaluations(evals);
        persistEvaluations(evals);
        return evals;
    }, [config.prompts, persistEvaluations]);

    // Run all generations
    const runGenerations = useCallback(async (model) => {
        if (connectedProviders.length === 0) {
            setRunError('Provider connection is required');
            return false;
        }
        const modelSelection = model || settings.defaultEvalModel || fallbackModelSelection;

        setRunStatus('generating');
        setRunError(null);
        setStartTime(Date.now());
        setEndTime(null);

        // Initialize fresh evaluations
        initializeEvaluations();

        try {
            const results = await runAllEvals({
                adapter,
                modelSelection,
                skillA: config.skillA,
                skillB: config.skillB,
                prompts: config.prompts,
                maxTokens: 8192,
                onProgress: (p) => setProgress(p)
            });

            setEvaluations(results);
            persistEvaluations(results);
            setEndTime(Date.now());
            setRunStatus('idle');
            return true;
        } catch (error) {
            setRunError(error.message);
            setRunStatus('idle');
            setEndTime(Date.now());
            return false;
        }
    }, [adapter, settings, config, connectedProviders.length, fallbackModelSelection, initializeEvaluations, persistEvaluations]);

    // Run all judgments
    const runJudgments = useCallback(async (judgeModel) => {
        if (connectedProviders.length === 0) {
            setRunError('Provider connection is required');
            return false;
        }
        const judgeSelection = judgeModel || settings.defaultJudgeModel || fallbackModelSelection;

        setRunStatus('judging');
        setRunError(null);
        try {
            const results = await judgeAllEvals({
                adapter,
                modelSelection: judgeSelection,
                evaluations: [...evaluations],
                criteria: config.criteria,
                outputType: config.outputType,
                skillNames: {
                    skillA: config.skillA.filename || 'Skill A',
                    skillB: config.skillB.filename || 'Skill B'
                },
                onProgress: (p) => setProgress(p)
            });

            setEvaluations(results);
            persistEvaluations(results);
            setEndTime(Date.now());
            setRunStatus('complete');
            return true;
        } catch (error) {
            setRunError(error.message);
            setRunStatus('idle');
            return false;
        }
    }, [adapter, settings, config, connectedProviders.length, fallbackModelSelection, evaluations, persistEvaluations]);

    // Clear all run state
    const clearRunState = useCallback(() => {
        setEvaluations([]);
        setRunStatus('idle');
        setProgress({ current: 0, total: 0, phase: '' });
        setRunError(null);
        setStartTime(null);
        setEndTime(null);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    // Computed stats
    const stats = {
        totalEvals: evaluations.length,
        generatedCount: evaluations.filter(e =>
            e.resultA.status === 'complete' && e.resultB.status === 'complete'
        ).length,
        judgedCount: evaluations.filter(e => e.judge.status === 'complete').length,
        aWins: evaluations.filter(e => e.judge.scores?.winner === 'A').length,
        bWins: evaluations.filter(e => e.judge.scores?.winner === 'B').length,
        canJudge: evaluations.some(e =>
            e.resultA.status === 'complete' &&
            e.resultB.status === 'complete' &&
            e.judge.status !== 'complete'
        )
    };

    return (
        <EvalRunContext.Provider value={{
            evaluations,
            runStatus,
            progress,
            runError,
            startTime,
            endTime,
            stats,
            runGenerations,
            runJudgments,
            clearRunState
        }}>
            {children}
        </EvalRunContext.Provider>
    );
}

export function useEvalRun() {
    const context = useContext(EvalRunContext);
    if (!context) {
        throw new Error('useEvalRun must be used within an EvalRunProvider');
    }
    return context;
}
