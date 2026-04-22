/* eslint-disable react-refresh/only-export-components */
/**
 * Evaluation Run Context
 * Manages state for active evaluation runs (generation, judging, results)
 */

import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { runAllEvals } from '../utils/runEval';
import { judgeAllEvals } from '../utils/judgeEval';
import {
    createRunHistory,
    deleteRunHistory,
    listRunHistory,
    loadRunHistory,
    updateRunHistory,
} from '../utils/runHistoryClient';
import { useSettings } from './SettingsContext';
import { useEvalConfig } from './EvalConfigContext';
import { useLlmHub } from './LlmHubContext';
import {
    createEvaluation,
    getBaselineSkill,
    getChallengerSkills,
    getConfiguredSkills,
    normalizeEvaluation,
} from '../utils/evaluationModel';

const EvalRunContext = createContext(null);

const STORAGE_KEY = 'skill_eval_run_state';
const ACTIVE_RUN_KEY = 'skill_eval_active_run_id';

export function EvalRunProvider({ children }) {
    const { settings } = useSettings();
    const { config, replaceConfig } = useEvalConfig();
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
    const [historyError, setHistoryError] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [endTime, setEndTime] = useState(null);
    const [runHistory, setRunHistory] = useState([]);
    const [activeRunId, setActiveRunId] = useState(() => localStorage.getItem(ACTIVE_RUN_KEY));
    const [activeRunName, setActiveRunName] = useState('');
    const stopRequestedRef = useRef(false);
    const activeRunIdRef = useRef(activeRunId);
    const activeSkills = useMemo(() => getConfiguredSkills(config), [config]);
    const baselineSkill = useMemo(() => getBaselineSkill(activeSkills), [activeSkills]);
    const challengerSkills = useMemo(() => getChallengerSkills(activeSkills), [activeSkills]);
    const normalizedEvaluations = useMemo(() => (
        evaluations.map((evaluation, index) => normalizeEvaluation(
            evaluation,
            config.prompts[index] ?? evaluation?.prompt,
            index,
            activeSkills,
        ))
    ), [activeSkills, config.prompts, evaluations]);

    const refreshRunHistory = useCallback(async () => {
        try {
            const runs = await listRunHistory();
            setRunHistory(runs);
            setHistoryError(null);
            return runs;
        } catch (error) {
            setHistoryError(error.message);
            return [];
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        listRunHistory()
            .then((runs) => {
                if (!cancelled) {
                    setRunHistory(runs);
                    setHistoryError(null);
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    console.warn('Run history bootstrap unavailable:', error);
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const setActiveRun = useCallback((id, name = '') => {
        activeRunIdRef.current = id || null;
        setActiveRunId(id || null);
        setActiveRunName(name || '');
        if (id) {
            localStorage.setItem(ACTIVE_RUN_KEY, id);
        } else {
            localStorage.removeItem(ACTIVE_RUN_KEY);
        }
    }, []);

    // Persist evaluations
    const persistEvaluations = useCallback((evals) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(evals));
        } catch (e) {
            console.warn('Failed to persist evaluations:', e);
        }
    }, []);

    const buildRunPayload = useCallback(({
        evals = evaluations,
        status = runStatus,
        progressState = progress,
        startedAt = startTime,
        finishedAt = endTime,
        name = activeRunName,
    } = {}) => ({
        name,
        status: progressState?.phase === 'stopped' ? 'stopped' : status,
        config,
        evaluations: evals,
        progress: progressState,
        startTime: startedAt,
        endTime: finishedAt,
    }), [activeRunName, config, endTime, evaluations, progress, runStatus, startTime]);

    const saveRunSnapshot = useCallback(async (payload, name) => {
        try {
            const runId = activeRunIdRef.current;
            const saved = runId
                ? await updateRunHistory(runId, payload, name)
                : await createRunHistory(payload, name);
            setActiveRun(saved.id, saved.name);
            await refreshRunHistory();
            setHistoryError(null);
            return saved;
        } catch (error) {
            setHistoryError(error.message);
            return null;
        }
    }, [refreshRunHistory, setActiveRun]);

    const autosaveRunSnapshot = useCallback((payload, name) => {
        saveRunSnapshot(payload, name);
    }, [saveRunSnapshot]);

    // Initialize evaluations from prompts
    const initializeEvaluations = useCallback(() => {
        const evals = config.prompts.map((prompt, index) => createEvaluation(prompt, index, activeSkills));
        setEvaluations(evals);
        persistEvaluations(evals);
        return evals;
    }, [activeSkills, config.prompts, persistEvaluations]);

    const hasMatchingPrompts = useCallback((evals) => (
        evals.length === config.prompts.length &&
        evals.every((ev, idx) => ev.prompt === config.prompts[idx])
    ), [config.prompts]);

    const startNewRun = useCallback(async () => {
        const evals = config.prompts.map((prompt, index) => createEvaluation(prompt, index, activeSkills));
        const timestamp = Date.now();
        const baselineLabel = baselineSkill?.filename || 'Baseline';
        const name = challengerSkills.length <= 1
            ? `${baselineLabel} vs ${challengerSkills[0]?.filename || 'Challenger'} - ${new Date(timestamp).toLocaleString()}`
            : `${baselineLabel} vs ${challengerSkills.length} challengers - ${new Date(timestamp).toLocaleString()}`;
        const progressState = { current: 0, total: 0, phase: '' };

        setEvaluations(evals);
        persistEvaluations(evals);
        setRunStatus('idle');
        setProgress(progressState);
        setRunError(null);
        setStartTime(null);
        setEndTime(null);
        stopRequestedRef.current = false;
        setActiveRun(null);

        const payload = buildRunPayload({
            evals,
            status: 'idle',
            progressState,
            startedAt: null,
            finishedAt: null,
            name,
        });
        await saveRunSnapshot(payload, name);
        return true;
    }, [activeSkills, baselineSkill?.filename, buildRunPayload, challengerSkills, config.prompts, persistEvaluations, saveRunSnapshot, setActiveRun]);

    const loadRun = useCallback(async (id) => {
        try {
            const run = await loadRunHistory(id);
            const payload = run.payload || {};
            replaceConfig(payload.config || {});
            const loadedSkills = getConfiguredSkills(payload.config || {});
            const loadedEvaluations = (payload.evaluations || []).map((evaluation, index) => normalizeEvaluation(
                evaluation,
                payload.config?.prompts?.[index] ?? evaluation?.prompt,
                index,
                loadedSkills,
            ));
            setEvaluations(loadedEvaluations);
            persistEvaluations(loadedEvaluations);
            setRunStatus('idle');
            setProgress(payload.progress || { current: 0, total: 0, phase: '' });
            setRunError(null);
            setStartTime(payload.startTime || null);
            setEndTime(payload.endTime || null);
            stopRequestedRef.current = false;
            setActiveRun(run.id, run.name);
            setHistoryError(null);
            return true;
        } catch (error) {
            setHistoryError(error.message);
            return false;
        }
    }, [persistEvaluations, replaceConfig, setActiveRun]);

    const deleteRun = useCallback(async (id) => {
        try {
            await deleteRunHistory(id);
            if (activeRunIdRef.current === id) {
                setActiveRun(null);
            }
            await refreshRunHistory();
            setHistoryError(null);
            return true;
        } catch (error) {
            setHistoryError(error.message);
            return false;
        }
    }, [refreshRunHistory, setActiveRun]);

    // Run all generations
    const runGenerations = useCallback(async (model, options = {}) => {
        if (connectedProviders.length === 0) {
            setRunError('Provider connection is required');
            return false;
        }
        const modelSelection = model || settings.defaultEvalModel || fallbackModelSelection;
        const hasScopedRun = options.promptIndexes?.length > 0 || options.resumeOnly;

        setRunStatus('generating');
        setRunError(null);
        stopRequestedRef.current = false;
        setStartTime(Date.now());
        setEndTime(null);

        const startingEvaluations = hasScopedRun && hasMatchingPrompts(normalizedEvaluations)
            ? normalizedEvaluations
            : initializeEvaluations();
        const startedAt = Date.now();
        const initialProgress = { current: 0, total: 0, phase: 'generating' };
        const initialPayload = buildRunPayload({
            evals: startingEvaluations,
            status: 'generating',
            progressState: initialProgress,
            startedAt,
            finishedAt: null,
        });
        await saveRunSnapshot(initialPayload, activeRunName);

        try {
            const results = await runAllEvals({
                adapter,
                modelSelection,
                skills: activeSkills,
                prompts: config.prompts,
                evaluations: startingEvaluations,
                promptIndexes: options.promptIndexes,
                resumeOnly: Boolean(options.resumeOnly),
                maxTokens: 8192,
                onProgress: (p) => {
                    setProgress(p);
                    autosaveRunSnapshot(buildRunPayload({
                        evals: startingEvaluations,
                        status: 'generating',
                        progressState: p,
                        startedAt,
                        finishedAt: null,
                    }), activeRunName);
                },
                shouldStop: () => stopRequestedRef.current,
            });

            setEvaluations(results);
            persistEvaluations(results);
            const finishedAt = Date.now();
            setEndTime(finishedAt);
            setRunStatus('idle');
            if (stopRequestedRef.current) {
                const stoppedProgress = { ...progress, phase: 'stopped' };
                setProgress(stoppedProgress);
                await saveRunSnapshot(buildRunPayload({
                    evals: results,
                    status: 'stopped',
                    progressState: stoppedProgress,
                    startedAt,
                    finishedAt,
                }), activeRunName);
            } else {
                const completedSides = results.reduce((count, evaluation) => (
                    count + activeSkills.reduce((skillCount, skill) => (
                        skillCount + (
                            ['complete', 'error'].includes(evaluation.resultsBySkillId?.[skill.id]?.status) ? 1 : 0
                        )
                    ), 0)
                ), 0);
                await saveRunSnapshot(buildRunPayload({
                    evals: results,
                    status: 'idle',
                    progressState: { current: completedSides, total: results.length * activeSkills.length, phase: 'generated' },
                    startedAt,
                    finishedAt,
                }), activeRunName);
            }
            return true;
        } catch (error) {
            setRunError(error.message);
            setRunStatus('idle');
            const finishedAt = Date.now();
            setEndTime(finishedAt);
            await saveRunSnapshot(buildRunPayload({
                evals: startingEvaluations,
                status: 'error',
                progressState: { ...progress, phase: 'error' },
                startedAt,
                finishedAt,
            }), activeRunName);
            return false;
        }
    }, [activeSkills, adapter, settings, config, connectedProviders.length, fallbackModelSelection, initializeEvaluations, persistEvaluations, normalizedEvaluations, hasMatchingPrompts, buildRunPayload, saveRunSnapshot, activeRunName, autosaveRunSnapshot, progress]);

    // Run all judgments
    const runJudgments = useCallback(async (judgeModel, options = {}) => {
        if (connectedProviders.length === 0) {
            setRunError('Provider connection is required');
            return false;
        }
        const judgeSelection = judgeModel || settings.defaultJudgeModel || fallbackModelSelection;

        setRunStatus('judging');
        setRunError(null);
        stopRequestedRef.current = false;
        const startedAt = startTime || Date.now();
        const selectedChallengerIds = options.challengerSkillIds?.length ? new Set(options.challengerSkillIds) : null;
        const judgmentRemainingCount = normalizedEvaluations.reduce((count, evaluation) => (
            count + challengerSkills.filter((challenger) => {
                if (selectedChallengerIds && !selectedChallengerIds.has(challenger.id)) {
                    return false;
                }
                const baselineResult = evaluation.resultsBySkillId?.[baselineSkill?.id];
                const challengerResult = evaluation.resultsBySkillId?.[challenger.id];
                const comparison = evaluation.comparisons?.[challenger.id];
                return baselineResult?.status === 'complete'
                    && challengerResult?.status === 'complete'
                    && comparison?.judge?.status !== 'complete';
            }).length
        ), 0);
        const initialProgress = { current: 0, total: judgmentRemainingCount, phase: 'judging' };
        await saveRunSnapshot(buildRunPayload({
            evals: normalizedEvaluations,
            status: 'judging',
            progressState: initialProgress,
            startedAt,
            finishedAt: null,
        }), activeRunName);
        try {
            const results = await judgeAllEvals({
                adapter,
                modelSelection: judgeSelection,
                evaluations: [...normalizedEvaluations],
                criteria: config.criteria,
                outputType: config.outputType,
                skills: activeSkills,
                evaluationIds: options.evaluationIds,
                challengerSkillIds: options.challengerSkillIds,
                onProgress: (p) => {
                    setProgress(p);
                    autosaveRunSnapshot(buildRunPayload({
                        evals: normalizedEvaluations,
                        status: 'judging',
                        progressState: p,
                        startedAt,
                        finishedAt: null,
                    }), activeRunName);
                },
                shouldStop: () => stopRequestedRef.current,
            });

            setEvaluations(results);
            persistEvaluations(results);
            const finishedAt = Date.now();
            setEndTime(finishedAt);
            setRunStatus('idle');
            if (stopRequestedRef.current) {
                const stoppedProgress = { ...progress, phase: 'stopped' };
                setProgress(stoppedProgress);
                await saveRunSnapshot(buildRunPayload({
                    evals: results,
                    status: 'stopped',
                    progressState: stoppedProgress,
                    startedAt,
                    finishedAt,
                }), activeRunName);
            } else {
                const judgedCount = results.reduce((count, evaluation) => (
                    count + challengerSkills.filter((challenger) => (
                        evaluation.comparisons?.[challenger.id]?.judge?.status === 'complete'
                    )).length
                ), 0);
                await saveRunSnapshot(buildRunPayload({
                    evals: results,
                    status: 'idle',
                    progressState: { current: judgedCount, total: results.length * challengerSkills.length, phase: 'judged' },
                    startedAt,
                    finishedAt,
                }), activeRunName);
            }
            return true;
        } catch (error) {
            setRunError(error.message);
            setRunStatus('idle');
            await saveRunSnapshot(buildRunPayload({
                evals: normalizedEvaluations,
                status: 'error',
                progressState: { ...progress, phase: 'error' },
                startedAt,
                finishedAt: Date.now(),
            }), activeRunName);
            return false;
        }
    }, [activeSkills, adapter, baselineSkill?.id, challengerSkills, settings, config, connectedProviders.length, fallbackModelSelection, normalizedEvaluations, persistEvaluations, saveRunSnapshot, buildRunPayload, activeRunName, startTime, autosaveRunSnapshot, progress]);

    const requestStop = useCallback(() => {
        stopRequestedRef.current = true;
        setProgress((p) => ({ ...p, phase: 'stopping' }));
    }, []);

    // Clear all run state
    const clearRunState = useCallback(() => {
        setEvaluations([]);
        setRunStatus('idle');
        setProgress({ current: 0, total: 0, phase: '' });
        setRunError(null);
        setStartTime(null);
        setEndTime(null);
        stopRequestedRef.current = false;
        localStorage.removeItem(STORAGE_KEY);
        setActiveRun(null);
    }, [setActiveRun]);

    // Computed stats
    const stats = {
        totalEvals: normalizedEvaluations.length,
        generatedCount: normalizedEvaluations.filter((evaluation) => (
            activeSkills.every((skill) => ['complete', 'error'].includes(evaluation.resultsBySkillId?.[skill.id]?.status))
        )).length,
        judgedCount: normalizedEvaluations.reduce((count, evaluation) => (
            count + challengerSkills.filter((challenger) => (
                evaluation.comparisons?.[challenger.id]?.judge?.status === 'complete'
            )).length
        ), 0),
        aWins: challengerSkills[0]
            ? normalizedEvaluations.filter((evaluation) => (
                evaluation.comparisons?.[challengerSkills[0].id]?.judge?.scores?.winner === 'A'
            )).length
            : 0,
        bWins: challengerSkills[0]
            ? normalizedEvaluations.filter((evaluation) => (
                evaluation.comparisons?.[challengerSkills[0].id]?.judge?.scores?.winner === 'B'
            )).length
            : 0,
        generationRemainingCount: normalizedEvaluations.filter((evaluation) => (
            activeSkills.some((skill) => evaluation.resultsBySkillId?.[skill.id]?.status !== 'complete')
        )).length,
        judgmentRemainingCount: normalizedEvaluations.reduce((count, evaluation) => (
            count + challengerSkills.filter((challenger) => {
                const baselineResult = evaluation.resultsBySkillId?.[baselineSkill?.id];
                const challengerResult = evaluation.resultsBySkillId?.[challenger.id];
                const comparison = evaluation.comparisons?.[challenger.id];
                return baselineResult?.status === 'complete'
                    && challengerResult?.status === 'complete'
                    && comparison?.judge?.status !== 'complete';
            }).length
        ), 0),
        canJudge: normalizedEvaluations.some((evaluation) => (
            challengerSkills.some((challenger) => {
                const baselineResult = evaluation.resultsBySkillId?.[baselineSkill?.id];
                const challengerResult = evaluation.resultsBySkillId?.[challenger.id];
                const comparison = evaluation.comparisons?.[challenger.id];
                return baselineResult?.status === 'complete'
                    && challengerResult?.status === 'complete'
                    && comparison?.judge?.status !== 'complete';
            })
        )),
    };

    return (
        <EvalRunContext.Provider value={{
            evaluations,
            runStatus,
            progress,
            runError,
            historyError,
            startTime,
            endTime,
            activeRunId,
            activeRunName,
            runHistory,
            stats,
            runGenerations,
            runJudgments,
            requestStop,
            startNewRun,
            loadRun,
            deleteRun,
            refreshRunHistory,
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
