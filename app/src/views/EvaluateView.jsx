import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    Code2,
    Download,
    Edit3,
    Eye,
    History,
    Loader2,
    Play,
    Plus,
    RefreshCw,
    Scale,
    Sliders,
    StopCircle,
    Trash2,
    Trophy,
    XCircle,
} from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import { useSettings } from '../contexts/SettingsContext'
import { useLlmHub } from '../contexts/LlmHubContext'
import { useEvalConfig } from '../contexts/EvalConfigContext'
import { useEvalRun } from '../contexts/EvalRunContext'
import { checkServerHealth } from '../utils/screenshot'
import { extractRenderableHtml } from '../utils/renderablePreview'
import {
    getBaselineSkill,
    getChallengerSkills,
    getConfiguredSkills,
    getDisplayedEvaluation,
    normalizeEvaluation,
} from '../utils/evaluationModel'

const MotionDiv = motion.div
const MotionSpan = motion.span
const MOTION_EASE_ENTER = [0.22, 1, 0.36, 1]
const MOTION_EASE_EXIT = [0.4, 0, 1, 1]
const REDUCED_MOTION_TRANSITION = { duration: 0.14, ease: MOTION_EASE_ENTER }
const TAB_LAYOUT_TRANSITION = { type: 'spring', stiffness: 420, damping: 34, mass: 0.85 }
const EXPAND_TRANSITION = { duration: 0.28, ease: MOTION_EASE_ENTER }
const COLLAPSE_TRANSITION = { duration: 0.18, ease: MOTION_EASE_EXIT }
const STATUS_RAIL_TRANSITION = { duration: 0.18, ease: MOTION_EASE_ENTER }

function getRowActivity(ev) {
    const isGenerating = ev.resultA?.status === 'running' || ev.resultB?.status === 'running'
    const isJudging = ev.judge?.status === 'running'

    if (isJudging) {
        return {
            isRunning: true,
            label: 'Judging',
            barClassName: 'bg-amber-500 shadow-[0_0_18px_rgba(245,158,11,0.28)]',
            badgeClassName: 'bg-amber-500/12 text-amber-600',
        }
    }

    if (isGenerating) {
        return {
            isRunning: true,
            label: 'Running',
            barClassName: 'bg-[var(--color-accent)] shadow-[0_0_20px_rgba(37,99,235,0.24)]',
            badgeClassName: 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)]',
        }
    }

    return {
        isRunning: false,
        label: '',
        barClassName: '',
        badgeClassName: '',
    }
}

function getToolbarTone({ actionKey, runStatus, runError }) {
    if (runError) return 'error'
    if (runStatus === 'generating' || runStatus === 'judging') return 'running'
    if (actionKey === 'complete') return 'complete'
    return 'idle'
}

function ResultPanel({ title, filename, isWinner, winnerClassName, result, panelClassName = '' }) {
    const html = extractRenderableHtml(result?.content)
    const [manualMode, setManualMode] = useState(null)
    const mode = html ? (manualMode || 'preview') : 'code'

    return (
        <div className={panelClassName}>
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                            {title}
                        </h3>
                        {isWinner && <Trophy size={18} className={winnerClassName} />}
                    </div>
                    {filename ? (
                        <div className="mt-0.5 truncate text-sm text-[var(--color-text-muted)]">
                            {filename}
                        </div>
                    ) : null}
                </div>
                <div className="shrink-0">
                {html && !result?.error && (
                    <div className="flex overflow-hidden rounded-lg border border-[var(--color-border)]">
                        <button
                            type="button"
                            onClick={() => setManualMode('preview')}
                            className={`flex items-center gap-1 px-2 py-1 text-xs ${mode === 'preview' ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'}`}
                        >
                            <Eye size={12} />
                            Preview
                        </button>
                        <button
                            type="button"
                            onClick={() => setManualMode('code')}
                            className={`flex items-center gap-1 px-2 py-1 text-xs ${mode === 'code' ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'}`}
                        >
                            <Code2 size={12} />
                            Code
                        </button>
                    </div>
                )}
                </div>
            </div>
            {result?.error ? (
                <div className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-[var(--color-bg-tertiary)] p-3 text-xs font-mono">
                    <span className="text-[var(--color-error)]">{result.error}</span>
                </div>
            ) : html && mode === 'preview' ? (
                <iframe
                    title={`${title} preview`}
                    sandbox=""
                    srcDoc={html}
                    className="h-80 w-full rounded-lg border border-[var(--color-border)] bg-white"
                />
            ) : (
                <div className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-[var(--color-bg-tertiary)] p-3 text-xs font-mono">
                    {result?.content || <span className="text-[var(--color-text-muted)]">Pending...</span>}
                </div>
            )}
        </div>
    )
}

function TabButton({ active, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${active ? 'border-[var(--color-accent)] text-[var(--color-accent)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}`}
        >
            {children}
        </button>
    )
}

function EmptyState({ title, description, action }) {
    return (
        <Card className="p-10 text-center">
            <h3 className="mb-2 text-lg font-semibold text-[var(--color-text-primary)]">{title}</h3>
            <p className="mx-auto max-w-xl text-sm text-[var(--color-text-secondary)]">{description}</p>
            {action ? <div className="mt-5">{action}</div> : null}
        </Card>
    )
}

function formatModelLabel(model) {
    if (!model) return 'Not set'
    const modelName = model.displayName || model.label || model.modelId || 'Unknown model'
    const providerName = model.providerLabel || model.providerId || 'provider'
    return `${providerName} - ${modelName}`
}

function EvaluateView({ variant = 'classic' }) {
    const isV2 = variant === 'v2'
    const prefersReducedMotion = useReducedMotion()
    const { settings } = useSettings()
    const { connectedProviders } = useLlmHub()
    const { config, isReadyToEvaluate, updatePrompt } = useEvalConfig()
    const {
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
    } = useEvalRun()

    const [activeTab, setActiveTab] = useState(isV2 ? 'individual' : 'run')
    const [v2ResultsTab, setV2ResultsTab] = useState('summary')
    const [editingPromptIdx, setEditingPromptIdx] = useState(null)
    const [screenshotServerStatus, setScreenshotServerStatus] = useState(null)
    const [selectedRunId, setSelectedRunId] = useState('')
    const [runSelection, setRunSelection] = useState(new Set())
    const [judgeSelection, setJudgeSelection] = useState(new Set())
    const [runFilter, setRunFilter] = useState('all')
    const [judgeFilter, setJudgeFilter] = useState('all')
    const [expandedResultIds, setExpandedResultIds] = useState(() => (isV2 ? new Set([1]) : new Set()))
    const [highlightedResultId, setHighlightedResultId] = useState(null)
    const [resultsViewMode, setResultsViewMode] = useState('all')
    const [selectedResultId, setSelectedResultId] = useState(1)
    const [clockMs, setClockMs] = useState(0)
    const [selectedChallengerId, setSelectedChallengerId] = useState('')
    const [collapsedJudgeIds, setCollapsedJudgeIds] = useState(() => (
        isV2 ? new Set(config.prompts.map((_, idx) => idx + 1)) : new Set()
    ))
    const [collapsedBreakdownCards, setCollapsedBreakdownCards] = useState(new Set())
    const [isToolbarDetached, setIsToolbarDetached] = useState(false)
    const toolbarSentinelRef = useRef(null)
    const activeSkills = useMemo(() => getConfiguredSkills(config), [config])
    const baselineSkill = useMemo(() => getBaselineSkill(activeSkills), [activeSkills])
    const challengerSkills = useMemo(() => getChallengerSkills(activeSkills), [activeSkills])
    const activeChallengerId = challengerSkills.some((skill) => skill.id === selectedChallengerId)
        ? selectedChallengerId
        : challengerSkills[0]?.id || ''
    const currentChallengerSkill = challengerSkills.find((skill) => skill.id === activeChallengerId) || challengerSkills[0] || null
    const pairLabelA = baselineSkill?.filename || config.skillA?.filename || 'Baseline'
    const pairLabelB = currentChallengerSkill?.filename || config.skillB?.filename || 'Challenger'
    const pairedEvaluations = useMemo(() => (
        evaluations.map((evaluation, index) => getDisplayedEvaluation(
            evaluation,
            activeSkills,
            currentChallengerSkill?.id,
            config.prompts[index] ?? evaluation?.prompt,
            index,
        ))
    ), [activeSkills, config.prompts, currentChallengerSkill?.id, evaluations])

    const needsProviderConnection = connectedProviders.length === 0

    useEffect(() => {
        if (config.outputType === 'visual' || config.outputType === 'both') {
            checkServerHealth().then(setScreenshotServerStatus)
        }
    }, [config.outputType])

    const confirmTextOnlyJudging = async () => {
        const needsScreenshots = config.outputType === 'visual' || config.outputType === 'both'

        if (!needsScreenshots) {
            return true
        }

        const latestStatus = await checkServerHealth()
        setScreenshotServerStatus(latestStatus)

        if (latestStatus.available) {
            return true
        }

        return window.confirm(
            'Screenshot server unavailable. Continue with text-only evaluation?'
        )
    }

    const startJudging = async (options = undefined) => {
        const shouldContinue = await confirmTextOnlyJudging()

        if (!shouldContinue) {
            return
        }

        runJudgments(activeJudgeModel, options)
    }

    useEffect(() => {
        const resultsTabId = isV2 ? 'individual' : 'results'
        if (activeTab !== resultsTabId || !highlightedResultId) return
        const element = document.getElementById(`result-card-${highlightedResultId}`)
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }, [activeTab, highlightedResultId, isV2])

    useEffect(() => {
        if (!startTime || endTime) return undefined
        const intervalId = window.setInterval(() => {
            setClockMs(Date.now())
        }, 1000)
        return () => window.clearInterval(intervalId)
    }, [startTime, endTime])

    useEffect(() => {
        if (!isV2) return undefined
        const node = toolbarSentinelRef.current
        if (!node || typeof IntersectionObserver === 'undefined') return undefined

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsToolbarDetached(entry.intersectionRatio < 1)
            },
            {
                threshold: [1],
                rootMargin: '-16px 0px 0px 0px',
            },
        )

        observer.observe(node)
        return () => observer.disconnect()
    }, [isV2])

    const formatTime = (ms) => {
        if (!ms) return '0s'
        const seconds = Math.floor(ms / 1000)
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        if (mins > 0) return `${mins}m ${secs}s`
        return `${secs}s`
    }

    const formatDateTime = (value) => {
        if (!value) return ''
        return new Date(value).toLocaleString()
    }

    const exportAsJSON = () => {
        const exportData = {
            exportedAt: new Date().toISOString(),
            baselineSkill: pairLabelA,
            challengerSkill: pairLabelB,
            criteria: config.criteria,
            summary: {
                total: pairedEvaluations.length,
                judged: pairedEvaluations.filter((evaluation) => evaluation.judge?.status === 'complete').length,
                aWins: pairedEvaluations.filter((evaluation) => evaluation.judge?.scores?.winner === 'A').length,
                bWins: pairedEvaluations.filter((evaluation) => evaluation.judge?.scores?.winner === 'B').length,
                ties: pairedEvaluations.filter((evaluation) => evaluation.judge?.status === 'complete' && evaluation.judge?.scores?.winner === 'tie').length,
            },
            evaluations: pairedEvaluations.map((ev) => ({
                id: ev.id,
                prompt: ev.prompt,
                resultA: { content: ev.resultA.content, elapsed: ev.resultA.elapsed },
                resultB: { content: ev.resultB.content, elapsed: ev.resultB.elapsed },
                judge: ev.judge.scores ? {
                    winner: ev.judge.scores.winner,
                    scoreA: ev.judge.scores.scoreA,
                    scoreB: ev.judge.scores.scoreB,
                    breakdown: ev.judge.scores.breakdown,
                    reasoning: ev.judge.result,
                } : null,
            })),
        }
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `skill-eval-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const exportAsCSV = () => {
        const headers = ['ID', 'Prompt', 'Winner', `${pairLabelA} Score`, `${pairLabelB} Score`, ...config.criteria.map((c) => `${c.name} (${pairLabelA})`), ...config.criteria.map((c) => `${c.name} (${pairLabelB})`)]
        const rows = pairedEvaluations.map((ev) => {
            const scores = ev.judge.scores
            const criteriaScoresA = config.criteria.map((c) => scores?.breakdown?.[c.id]?.A || '')
            const criteriaScoresB = config.criteria.map((c) => scores?.breakdown?.[c.id]?.B || '')
            return [
                ev.id,
                `"${ev.prompt.replace(/"/g, '""')}"`,
                scores?.winner || '',
                scores?.scoreA || '',
                scores?.scoreB || '',
                ...criteriaScoresA,
                ...criteriaScoresB,
            ]
        })
        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `skill-eval-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const elapsedTime = startTime ? ((endTime || clockMs || startTime) - startTime) : 0
    const isBusy = runStatus !== 'idle'
    const isStopping = progress.phase === 'stopping'
    const maxPromptId = config.prompts.length
    const activeGenerationModel = settings.defaultEvalModel
    const activeJudgeModel = settings.defaultJudgeModel
    const safeRunSelection = new Set([...runSelection].filter((id) => id >= 1 && id <= maxPromptId))
    const safeJudgeSelection = new Set([...judgeSelection].filter((id) => id >= 1 && id <= maxPromptId))
    const safeExpandedResultIds = new Set([...expandedResultIds].filter((id) => id >= 1 && id <= maxPromptId))
    const currentSelectedRunId = selectedRunId || activeRunId || ''
    const safeSelectedResultId = Math.min(Math.max(selectedResultId, 1), Math.max(maxPromptId, 1))
    const settingsPath = isV2 ? '/v2/settings' : '/settings'
    const isBreakdownCardCollapsed = (cardId) => collapsedBreakdownCards.has(cardId)
    const comparisonStats = {
        totalEvals: pairedEvaluations.length,
        generatedCount: pairedEvaluations.filter((evaluation) => (
            evaluation.resultA?.status === 'complete' && evaluation.resultB?.status === 'complete'
        )).length,
        judgedCount: pairedEvaluations.filter((evaluation) => evaluation.judge?.status === 'complete').length,
        readyToJudgeCount: pairedEvaluations.filter((evaluation) => (
            evaluation.resultA?.status === 'complete'
            && evaluation.resultB?.status === 'complete'
            && evaluation.judge?.status !== 'complete'
        )).length,
        aWins: pairedEvaluations.filter((evaluation) => evaluation.judge?.scores?.winner === 'A').length,
        bWins: pairedEvaluations.filter((evaluation) => evaluation.judge?.scores?.winner === 'B').length,
        canJudge: pairedEvaluations.some((evaluation) => (
            evaluation.resultA?.status === 'complete'
            && evaluation.resultB?.status === 'complete'
            && evaluation.judge?.status !== 'complete'
        )),
    }
    const normalizedEvaluations = useMemo(() => (
        evaluations.map((evaluation, index) => normalizeEvaluation(
            evaluation,
            config.prompts[index] ?? evaluation?.prompt,
            index,
            activeSkills,
        ))
    ), [activeSkills, config.prompts, evaluations])
    const skillRows = useMemo(() => (
        activeSkills.map((skill, index) => ({
            id: skill.id,
            name: skill.filename || `Skill ${index + 1}`,
            role: index === 0 ? 'Baseline' : 'Challenger',
        }))
    ), [activeSkills])
    const judgedComparisons = useMemo(() => {
        if (!baselineSkill) return []
        return normalizedEvaluations.flatMap((evaluation) => (
            challengerSkills.flatMap((challenger) => {
                const comparison = evaluation.comparisons?.[challenger.id]
                if (!comparison?.judge?.scores) return []
                return [{
                    evaluationId: evaluation.id,
                    prompt: evaluation.prompt,
                    challengerId: challenger.id,
                    challengerName: challenger.filename || challenger.id,
                    winner: comparison.judge.scores.winner,
                    scoreA: comparison.judge.scores.scoreA || 0,
                    scoreB: comparison.judge.scores.scoreB || 0,
                    breakdown: comparison.judge.scores.breakdown || {},
                }]
            })
        ))
    }, [baselineSkill, challengerSkills, normalizedEvaluations])
    const leaderboardRows = useMemo(() => {
        const rowMap = new Map(skillRows.map((row) => [row.id, {
            ...row,
            wins: 0,
            losses: 0,
            ties: 0,
            judged: 0,
            totalScore: 0,
        }]))

        judgedComparisons.forEach((comparison) => {
            const baselineRow = rowMap.get(baselineSkill?.id)
            const challengerRow = rowMap.get(comparison.challengerId)
            if (!baselineRow || !challengerRow) return

            baselineRow.judged += 1
            baselineRow.totalScore += comparison.scoreA
            challengerRow.judged += 1
            challengerRow.totalScore += comparison.scoreB

            if (comparison.winner === 'A') {
                baselineRow.wins += 1
                challengerRow.losses += 1
            } else if (comparison.winner === 'B') {
                challengerRow.wins += 1
                baselineRow.losses += 1
            } else {
                baselineRow.ties += 1
                challengerRow.ties += 1
            }
        })

        return [...rowMap.values()]
            .map((row) => ({
                ...row,
                avgScore: row.judged ? row.totalScore / row.judged : null,
                winRate: row.judged ? row.wins / row.judged : 0,
            }))
            .sort((left, right) => (
                (right.winRate - left.winRate)
                || ((right.avgScore || 0) - (left.avgScore || 0))
                || (right.wins - left.wins)
                || left.name.localeCompare(right.name)
            ))
    }, [baselineSkill?.id, judgedComparisons, skillRows])
    const challengerSummaryRows = useMemo(() => (
        challengerSkills.map((challenger) => {
            const rows = judgedComparisons.filter((comparison) => comparison.challengerId === challenger.id)
            const baselineWins = rows.filter((comparison) => comparison.winner === 'A').length
            const challengerWins = rows.filter((comparison) => comparison.winner === 'B').length
            const ties = rows.filter((comparison) => comparison.winner === 'tie').length
            const avgBaseline = rows.length
                ? rows.reduce((total, comparison) => total + comparison.scoreA, 0) / rows.length
                : null
            const avgChallenger = rows.length
                ? rows.reduce((total, comparison) => total + comparison.scoreB, 0) / rows.length
                : null

            return {
                id: challenger.id,
                name: challenger.filename || challenger.id,
                judged: rows.length,
                baselineWins,
                challengerWins,
                ties,
                avgBaseline,
                avgChallenger,
                leader: baselineWins > challengerWins ? pairLabelA : challengerWins > baselineWins ? (challenger.filename || challenger.id) : 'Tie',
            }
        })
    ), [challengerSkills, judgedComparisons, pairLabelA])
    const criterionMatrixRows = useMemo(() => {
        const rowMap = new Map(skillRows.map((row) => [row.id, {
            ...row,
            judged: 0,
            totalScore: 0,
            criterionTotals: Object.fromEntries(config.criteria.map((criterion) => [criterion.id, 0])),
            criterionCounts: Object.fromEntries(config.criteria.map((criterion) => [criterion.id, 0])),
        }]))

        judgedComparisons.forEach((comparison) => {
            const baselineRow = rowMap.get(baselineSkill?.id)
            const challengerRow = rowMap.get(comparison.challengerId)
            if (!baselineRow || !challengerRow) return

            baselineRow.judged += 1
            baselineRow.totalScore += comparison.scoreA
            challengerRow.judged += 1
            challengerRow.totalScore += comparison.scoreB

            config.criteria.forEach((criterion) => {
                const criterionScores = comparison.breakdown?.[criterion.id]
                if (!criterionScores) return
                baselineRow.criterionTotals[criterion.id] += criterionScores.A || 0
                baselineRow.criterionCounts[criterion.id] += 1
                challengerRow.criterionTotals[criterion.id] += criterionScores.B || 0
                challengerRow.criterionCounts[criterion.id] += 1
            })
        })

        return [...rowMap.values()]
            .map((row) => ({
                ...row,
                avgScore: row.judged ? row.totalScore / row.judged : null,
                criteria: Object.fromEntries(config.criteria.map((criterion) => [
                    criterion.id,
                    row.criterionCounts[criterion.id]
                        ? row.criterionTotals[criterion.id] / row.criterionCounts[criterion.id]
                        : null,
                ])),
            }))
            .sort((left, right) => (
                ((right.avgScore || 0) - (left.avgScore || 0))
                || left.name.localeCompare(right.name)
            ))
    }, [baselineSkill?.id, config.criteria, judgedComparisons, skillRows])
    const criterionLeaderRows = useMemo(() => (
        config.criteria.map((criterion) => {
            const rankedSkills = criterionMatrixRows
                .map((row) => ({
                    skillName: row.name,
                    avg: row.criteria[criterion.id],
                }))
                .filter((row) => row.avg !== null)
                .sort((left, right) => right.avg - left.avg)

            return {
                id: criterion.id,
                name: criterion.name,
                leaderName: rankedSkills[0]?.skillName || '—',
                leaderAvg: rankedSkills[0]?.avg ?? null,
                runnerUpName: rankedSkills[1]?.skillName || '—',
                runnerUpAvg: rankedSkills[1]?.avg ?? null,
            }
        })
    ), [config.criteria, criterionMatrixRows])

    const getPromptStatus = (idx) => {
        const ev = pairedEvaluations[idx]
        return {
            a: ev?.resultA?.status || 'pending',
            b: ev?.resultB?.status || 'pending',
            aTime: ev?.resultA?.elapsed,
            bTime: ev?.resultB?.elapsed,
            judged: ev?.judge?.status === 'complete',
            judgeStatus: ev?.judge?.status || 'pending',
        }
    }

    const runPromptRows = config.prompts.map((prompt, idx) => {
        const status = getPromptStatus(idx)
        return {
            id: idx + 1,
            prompt,
            status,
            isPending: status.a === 'pending' && status.b === 'pending',
            isRunning: status.a === 'running' || status.b === 'running',
            isComplete: status.a === 'complete' && status.b === 'complete',
            isFailed: status.a === 'error' || status.b === 'error',
        }
    })

    const judgePromptRows = config.prompts.map((prompt, idx) => {
        const status = getPromptStatus(idx)
        const isReady = status.a === 'complete' && status.b === 'complete' && !status.judged
        return {
            id: idx + 1,
            prompt,
            status,
            isReady,
            isJudged: status.judged,
            isWaiting: !isReady && !status.judged,
        }
    })

    const filterRunRow = (row) => {
        switch (runFilter) {
            case 'pending':
                return row.isPending
            case 'running':
                return row.isRunning
            case 'complete':
                return row.isComplete
            case 'failed':
                return row.isFailed
            default:
                return true
        }
    }

    const filterJudgeRow = (row) => {
        switch (judgeFilter) {
            case 'ready':
                return row.isReady
            case 'judged':
                return row.isJudged
            case 'waiting':
                return row.isWaiting
            default:
                return true
        }
    }

    const visibleRunRows = runPromptRows.filter(filterRunRow)
    const visibleJudgeRows = judgePromptRows.filter(filterJudgeRow)
    const runSelectedIndexes = [...safeRunSelection].map((id) => id - 1)
    const hasSelectedPrompts = safeRunSelection.size > 0
    const hasRunResults = pairedEvaluations.some((ev) => (
        ['running', 'complete', 'error'].includes(ev?.resultA?.status)
        || ['running', 'complete', 'error'].includes(ev?.resultB?.status)
    ))
    const runSelectedRemaining = runSelectedIndexes.filter((idx) => {
        const ev = pairedEvaluations[idx]
        return !ev || ev.resultA?.status !== 'complete' || ev.resultB?.status !== 'complete'
    }).length
    const judgeSelectedIds = [...safeJudgeSelection].filter((id) => {
        const ev = pairedEvaluations[id - 1]
        return ev && ev.resultA?.status === 'complete' && ev.resultB?.status === 'complete' && ev.judge?.status !== 'complete'
    })

    const overallStatusText = () => {
        if (runStatus === 'generating') {
            return isStopping ? 'Stopping after batch' : 'Running'
        }
        if (runStatus === 'judging') {
            return isStopping ? 'Stopping after batch' : 'Judging'
        }
        if (progress.phase === 'stopped') return 'Stopped'
        if (runError) return 'Error'
        return 'Idle'
    }

    const allPromptsSelected = pairedEvaluations.length > 0 && safeRunSelection.size === pairedEvaluations.length
    const allResultsExpanded = pairedEvaluations.length > 0 && safeExpandedResultIds.size === pairedEvaluations.length
    const hasResumeAction = evaluations.length > 0 && stats.generationRemainingCount > 0
    const showStopAction = ['generating', 'judging'].includes(runStatus)
    const toolbarPrimaryAction = (() => {
        if (runStatus === 'generating') {
            return {
                key: 'running',
                label: isStopping ? 'Stopping...' : 'Running...',
                icon: Loader2,
                action: undefined,
                disabled: true,
                iconClassName: 'animate-spin',
            }
        }
        if (runStatus === 'judging') {
            return {
                key: 'judging',
                label: isStopping ? 'Stopping...' : 'Judging...',
                icon: Loader2,
                action: undefined,
                disabled: true,
                iconClassName: 'animate-spin',
            }
        }
        if (hasSelectedPrompts) {
            return {
                key: 'rerun',
                label: 'Re-Run Selected',
                icon: RefreshCw,
                action: () => runGenerations(activeGenerationModel, { promptIndexes: runSelectedIndexes }),
                disabled: false,
            }
        }
        if (!hasRunResults) {
            return {
                key: 'start',
                label: 'Start Run',
                icon: Play,
                action: () => runGenerations(activeGenerationModel),
                disabled: false,
            }
        }
        if (hasResumeAction) {
            return {
                key: 'resume',
                label: 'Resume',
                icon: RefreshCw,
                action: () => runGenerations(activeGenerationModel, { resumeOnly: true }),
                disabled: false,
            }
        }
        if (stats.canJudge) {
            return {
                key: 'judge',
                label: 'Judge',
                icon: Scale,
                action: () => runJudgments(activeJudgeModel),
                disabled: false,
            }
        }
        return {
            key: 'complete',
            label: comparisonStats.judgedCount > 0 ? 'Judged' : 'Run Complete',
            icon: CheckCircle2,
            action: undefined,
            disabled: true,
        }
    })()
    const PrimaryToolbarIcon = toolbarPrimaryAction.icon
    const toolbarTone = getToolbarTone({
        actionKey: toolbarPrimaryAction.key,
        runStatus,
        runError,
    })
    const toolbarProgressRatio = progress.total > 0 ? Math.min(Math.max(progress.current / progress.total, 0), 1) : 0
    const toolbarMotionTransition = prefersReducedMotion ? REDUCED_MOTION_TRANSITION : TAB_LAYOUT_TRANSITION
    const showExportActions = hasRunResults || comparisonStats.judgedCount > 0

    const renderPromptWithEmphasis = (prompt) => {
        const trimmed = prompt.trim()
        const punctuation = trimmed.match(/[.?!]+$/)?.[0] || ''
        const barePrompt = trimmed.replace(/[.?!]+$/, '')
        const words = barePrompt.split(/\s+/)
        const verbs = new Set(['create', 'build', 'design', 'make', 'craft', 'generate'])
        const leadingModifiers = new Set([
            'a',
            'an',
            'the',
            'simple',
            'basic',
            'minimal',
            'modern',
            'elegant',
            'luxury',
            'clean',
            'responsive',
            'accessible',
            'interactive',
            'beautiful',
            'refined',
            'custom',
        ])
        const qualifierWords = new Set(['for', 'with', 'using', 'in', 'on', 'inside', 'featuring', 'that'])
        const genericArtifactTypes = new Set([
            'form',
            'component',
            'button',
            'card',
            'modal',
            'dialog',
            'section',
            'page',
            'layout',
            'table',
            'avatar',
            'toggle',
            'controls',
            'control',
            'banner',
            'hero',
        ])
        const cleanWord = (word) => word.replace(/^[^a-z0-9]+|[^a-z0-9-]+$/gi, '').toLowerCase()
        const toTitleCase = (parts) =>
            parts
                .map((part) =>
                    part
                        .split('-')
                        .map((segment) => segment ? `${segment[0].toUpperCase()}${segment.slice(1).toLowerCase()}` : segment)
                        .join('-'),
                )
                .join(' ')

        let cursor = 0
        if (verbs.has(cleanWord(words[0] || ''))) {
            cursor = 1
        }
        while (cursor < words.length && leadingModifiers.has(cleanWord(words[cursor]))) {
            cursor += 1
        }

        let qualifierIndex = words.findIndex((word, index) => index >= cursor && qualifierWords.has(cleanWord(word)))
        if (qualifierIndex === -1) {
            qualifierIndex = words.length
        }

        const prefixWords = words.slice(0, cursor)
        const artifactWords = words.slice(cursor, qualifierIndex)
        const qualifierTail = words.slice(qualifierIndex)

        let emphasizedWords = artifactWords
        let suffixWords = []

        if (artifactWords.length >= 2) {
            const trailingType = cleanWord(artifactWords[artifactWords.length - 1])
            if (genericArtifactTypes.has(trailingType)) {
                emphasizedWords = artifactWords.slice(0, -1)
                suffixWords = [artifactWords[artifactWords.length - 1]]
            }
        }

        if (emphasizedWords.length === 0) {
            emphasizedWords = artifactWords.length > 0 ? artifactWords : words
            suffixWords = []
        }

        const prefixText = prefixWords.join(' ')
        const emphasizedText = toTitleCase(emphasizedWords)
        const suffixText = [...suffixWords, ...qualifierTail].join(' ')

        return (
            <>
                {prefixText ? (
                    <span className="text-[var(--color-text-secondary)]">{`${prefixText} `}</span>
                ) : null}
                <span className="font-semibold text-[var(--color-text-primary)]">{emphasizedText}</span>
                {suffixText || punctuation ? (
                    <span className="text-[var(--color-text-secondary)]">{`${suffixText ? ` ${suffixText}` : ''}${punctuation}`}</span>
                ) : null}
            </>
        )
    }

    const renderStatusBadge = (status, time) => {
        const timeStr = time ? ` (${formatTime(time)})` : ''
        switch (status) {
            case 'complete':
                return (
                    <span className="inline-flex items-center gap-1 rounded bg-green-500/10 px-2 py-0.5 text-xs text-green-600">
                        <CheckCircle2 size={12} />
                        Complete{timeStr}
                    </span>
                )
            case 'error':
                return (
                    <span className="inline-flex items-center gap-1 rounded bg-red-500/10 px-2 py-0.5 text-xs text-red-600">
                        <XCircle size={12} />
                        Error
                    </span>
                )
            case 'running':
                return (
                    <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-xs text-blue-600">
                        <Loader2 size={12} className="animate-spin" />
                        Running
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
                        <Clock size={12} />
                        Pending
                    </span>
                )
        }
    }

    const renderJudgeBadge = (row) => {
        if (row.isJudged) {
            return (
                <span className="inline-flex items-center gap-1 rounded bg-green-500/10 px-2 py-0.5 text-xs text-green-600">
                    <CheckCircle2 size={12} />
                    Judged
                </span>
            )
        }
        if (row.isReady) {
            return (
                <span className="inline-flex items-center gap-1 rounded bg-[var(--color-accent-subtle)] px-2 py-0.5 text-xs text-[var(--color-accent)]">
                    <Scale size={12} />
                    Ready
                </span>
            )
        }
        if (row.status.a === 'running' || row.status.b === 'running') {
            return (
                <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-xs text-blue-600">
                    <Loader2 size={12} className="animate-spin" />
                    Waiting
                </span>
            )
        }
        return (
            <span className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
                <Clock size={12} />
                Waiting for pair generation
            </span>
        )
    }

    const toggleSelection = (setter, id) => {
        setter((current) => {
            const next = new Set(current)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const selectVisibleRows = (setter, rows, condition = () => true) => {
        setter(new Set(rows.filter(condition).map((row) => row.id)))
    }

    const showResultCard = (id) => {
        setExpandedResultIds((current) => new Set(current).add(id))
        setHighlightedResultId(id)
        setActiveTab(isV2 ? 'individual' : 'results')
    }

    const toggleResultExpanded = (id) => {
        setExpandedResultIds((current) => {
            const next = new Set(current)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleJudgeExpanded = (id) => {
        setCollapsedJudgeIds((current) => {
            const next = new Set(current)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleBreakdownCard = (cardId) => {
        setCollapsedBreakdownCards((current) => {
            const next = new Set(current)
            if (next.has(cardId)) next.delete(cardId)
            else next.add(cardId)
            return next
        })
    }

    const renderResultCard = (ev, expanded, compact = false) => {
        const winner = ev.judge?.scores?.winner
        return (
            <Card
                key={ev.id}
                id={`result-card-${ev.id}`}
                className={`${highlightedResultId === ev.id ? 'border-[var(--color-accent)]' : ''} p-5`}
            >
                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge>{`Eval ${ev.id}`}</Badge>
                                {winner ? (
                                    <Badge variant="accent">Winner {winner}</Badge>
                                ) : ev.judge?.status === 'complete' ? (
                                    <Badge variant="default">Tie</Badge>
                                ) : null}
                            </div>
                            <p className="mt-3 text-[var(--color-text-primary)]">{ev.prompt}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="ghost" onClick={() => toggleResultExpanded(ev.id)}>
                                {expanded ? 'Collapse' : 'Expand'}
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm">
                        <span className="text-[var(--color-text-muted)]">A:</span>
                        {renderStatusBadge(ev.resultA?.status, ev.resultA?.elapsed)}
                        <span className="ml-3 text-[var(--color-text-muted)]">B:</span>
                        {renderStatusBadge(ev.resultB?.status, ev.resultB?.elapsed)}
                        <span className="ml-3 text-[var(--color-text-muted)]">Judge:</span>
                        {renderJudgeBadge({
                            isJudged: ev.judge?.status === 'complete',
                            isReady: ev.resultA?.status === 'complete' && ev.resultB?.status === 'complete' && ev.judge?.status !== 'complete',
                            status: {
                                a: ev.resultA?.status,
                                b: ev.resultB?.status,
                            },
                        })}
                    </div>

                    {expanded ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                <ResultPanel
                                    title="Baseline"
                                    filename={pairLabelA}
                                    isWinner={winner === 'A'}
                                    winnerClassName="text-green-600"
                                    result={ev.resultA}
                                />
                                <ResultPanel
                                    title="Challenger"
                                    filename={pairLabelB}
                                    isWinner={winner === 'B'}
                                    winnerClassName="text-orange-500"
                                    result={ev.resultB}
                                />
                            </div>
                            <div>
                                <h3 className="mb-2 text-sm font-medium text-[var(--color-text-muted)]">
                                    Judge Evaluation
                                </h3>
                                {ev.judge?.result ? (
                                    <div className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-[var(--color-bg-tertiary)] p-4 text-sm">
                                        {ev.judge.result}
                                    </div>
                                ) : (
                                    <div className="rounded-lg bg-[var(--color-bg-tertiary)] p-4 text-sm text-[var(--color-text-muted)]">
                                        No judge output yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className={`rounded-lg bg-[var(--color-bg-tertiary)] p-4 text-sm text-[var(--color-text-secondary)] ${compact ? 'max-w-4xl' : ''}`}>
                            {ev.judge?.result
                                ? ev.judge.result.slice(0, 220) + (ev.judge.result.length > 220 ? '…' : '')
                                : 'Expand to inspect generated outputs and judge reasoning.'}
                        </div>
                    )}
                </div>
            </Card>
        )
    }

    const renderV2IndividualCard = (ev) => {
        const expanded = safeExpandedResultIds.has(ev.id)
        const judgeCollapsed = collapsedJudgeIds.has(ev.id)
        const winner = ev.judge?.scores?.winner
        const status = getPromptStatus(ev.id - 1)
        const maxScore = config.criteria.length * 5
        const selected = safeRunSelection.has(ev.id)
        const rowActivity = getRowActivity(ev)
        const collapsedWinnerBadge = winner ? (
            <Badge
                size="sm"
                className={winner === 'A'
                    ? 'h-4.5 bg-green-500/12 px-1.5 py-0 text-[10px] leading-4 text-green-600'
                    : 'h-4.5 bg-blue-500/12 px-1.5 py-0 text-[10px] leading-4 text-blue-600'}
            >
                {`Winner ${winner}`}
            </Badge>
        ) : ev.judge?.status === 'complete' ? (
            <Badge size="sm" variant="default" className="h-4.5 px-1.5 py-0 text-[10px] leading-4">Tie</Badge>
        ) : null
        const headerToggleClassName = 'rounded-sm border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-0 text-[var(--color-text-muted)]'
        const handleExpandedBodyClick = (event) => {
            const interactiveTarget = event.target.closest('button, input, select, textarea, a, iframe, label')
            if (interactiveTarget) {
                return
            }
            toggleResultExpanded(ev.id)
        }
        const handleHeaderShellClick = (event) => {
            const interactiveTarget = event.target.closest('input, button, select, textarea, a, iframe, label')
            if (interactiveTarget) {
                return
            }
            toggleResultExpanded(ev.id)
        }
        const handleHeaderToggleKeyDown = (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                toggleResultExpanded(ev.id)
            }
        }

        return (
            <MotionDiv
                key={ev.id}
                layout="position"
                transition={prefersReducedMotion ? REDUCED_MOTION_TRANSITION : EXPAND_TRANSITION}
                whileHover={prefersReducedMotion ? undefined : { scale: 1.002 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.998 }}
            >
            <Card
                id={`result-card-${ev.id}`}
                className={`relative ${highlightedResultId === ev.id ? 'border-[var(--color-accent)] shadow-[0_0_0_1px_rgba(59,130,246,0.12)]' : ''} ${expanded ? 'rounded-xl' : 'rounded-md'} overflow-hidden border-[var(--color-border)]/90 bg-[var(--color-bg-secondary)] p-0 transition-[background-color,border-color,box-shadow,transform] duration-200 hover:bg-[var(--color-bg-elevated)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)] active:translate-y-px`}
            >
                <AnimatePresence initial={false}>
                    {rowActivity.isRunning ? (
                        <MotionDiv
                            key={`row-activity-${ev.id}`}
                            aria-hidden="true"
                            className={`pointer-events-none absolute inset-y-3 left-0 z-10 w-1 rounded-r-full ${rowActivity.barClassName}`}
                            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scaleY: 0.65 }}
                            animate={{ opacity: 1, scaleY: 1 }}
                            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scaleY: 0.7 }}
                            transition={STATUS_RAIL_TRANSITION}
                        />
                    ) : null}
                </AnimatePresence>
                <div
                    className="px-2.5 py-0.5"
                    onClick={handleHeaderShellClick}
                >
                    <div className="flex min-h-[38px] items-center gap-2">
                        {hasRunResults ? (
                            <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleSelection(setRunSelection, ev.id)}
                                onClick={(event) => event.stopPropagation()}
                                aria-label={`Select eval ${ev.id}`}
                                className="h-3 w-3 shrink-0"
                            />
                        ) : null}
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                                event.stopPropagation()
                                toggleResultExpanded(ev.id)
                            }}
                            onKeyDown={handleHeaderToggleKeyDown}
                            className="flex min-w-0 flex-1 items-center justify-between gap-1.5 rounded-md px-1 py-1 text-left outline-none transition-colors duration-200 hover:bg-[var(--color-bg-tertiary)]/70 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/30"
                        >
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                <Badge size="sm" className="shrink-0">
                                    {`Eval ${ev.id}`}
                                </Badge>
                                <div className={`min-w-0 flex-1 text-lg leading-8 text-[var(--color-text-primary)] ${expanded ? 'whitespace-normal break-words' : 'truncate'}`}>
                                    {renderPromptWithEmphasis(ev.prompt)}
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                {rowActivity.isRunning ? (
                                    <span className={`inline-flex h-4.5 items-center rounded-full px-1.5 text-[10px] font-medium leading-4 ${rowActivity.badgeClassName}`}>
                                        {rowActivity.label}
                                    </span>
                                ) : null}
                                {collapsedWinnerBadge}
                                <MotionDiv
                                    className={headerToggleClassName}
                                    animate={{ rotate: expanded ? 180 : 0 }}
                                    transition={prefersReducedMotion ? REDUCED_MOTION_TRANSITION : { duration: 0.14, ease: MOTION_EASE_ENTER }}
                                >
                                    <ChevronDown size={11} />
                                </MotionDiv>
                            </div>
                        </div>
                    </div>
                </div>

                <AnimatePresence initial={false}>
                {expanded ? (
                    <MotionDiv
                        key={`expanded-result-${ev.id}`}
                        initial={prefersReducedMotion ? { height: 0, opacity: 0 } : { height: 0, opacity: 0, y: 6 }}
                        animate={{ height: 'auto', opacity: 1, y: 0 }}
                        exit={prefersReducedMotion ? { height: 0, opacity: 0 } : { height: 0, opacity: 0, y: 2 }}
                        transition={prefersReducedMotion ? REDUCED_MOTION_TRANSITION : EXPAND_TRANSITION}
                        className="overflow-hidden"
                    >
                    <div
                        className="space-y-5 border-t border-[var(--color-border)] px-5 py-5"
                        onClick={handleExpandedBodyClick}
                    >
                        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                            <ResultPanel
                                title="Baseline"
                                filename={pairLabelA}
                                isWinner={winner === 'A'}
                                winnerClassName="text-green-600"
                                result={ev.resultA}
                                panelClassName={winner === 'A' ? 'rounded-2xl border border-blue-500/35 bg-blue-500/5 p-3 shadow-[0_0_0_1px_rgba(59,130,246,0.08),0_18px_48px_rgba(59,130,246,0.16)]' : 'rounded-2xl border border-[var(--color-border)]/70 p-3'}
                            />
                            <ResultPanel
                                title="Challenger"
                                filename={pairLabelB}
                                isWinner={winner === 'B'}
                                winnerClassName="text-orange-500"
                                result={ev.resultB}
                                panelClassName={winner === 'B' ? 'rounded-2xl border border-orange-500/35 bg-orange-500/5 p-3 shadow-[0_0_0_1px_rgba(249,115,22,0.08),0_18px_48px_rgba(249,115,22,0.16)]' : 'rounded-2xl border border-[var(--color-border)]/70 p-3'}
                            />
                        </div>

                        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                            <button
                                type="button"
                                onClick={() => toggleJudgeExpanded(ev.id)}
                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-[var(--color-bg-tertiary)]"
                            >
                                <div>
                                    <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                                        Judge Evaluation
                                    </div>
                                    <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                                        Collapsed by default to keep the review surface compact.
                                    </div>
                                </div>
                                <MotionDiv
                                    className="text-[var(--color-text-muted)]"
                                    animate={{ rotate: judgeCollapsed ? 0 : 180 }}
                                    transition={prefersReducedMotion ? REDUCED_MOTION_TRANSITION : { duration: 0.14, ease: MOTION_EASE_ENTER }}
                                >
                                    <ChevronDown size={16} />
                                </MotionDiv>
                            </button>

                            <AnimatePresence initial={false}>
                            {!judgeCollapsed ? (
                                <MotionDiv
                                    key={`judge-panel-${ev.id}`}
                                    initial={prefersReducedMotion ? { height: 0, opacity: 0 } : { height: 0, opacity: 0, y: 4 }}
                                    animate={{ height: 'auto', opacity: 1, y: 0 }}
                                    exit={prefersReducedMotion ? { height: 0, opacity: 0 } : { height: 0, opacity: 0, y: 2 }}
                                    transition={prefersReducedMotion ? REDUCED_MOTION_TRANSITION : EXPAND_TRANSITION}
                                    className="overflow-hidden"
                                >
                                <div className="space-y-4 border-t border-[var(--color-border)] px-4 py-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs text-[var(--color-text-muted)]">{pairLabelA}</span>
                                        {renderStatusBadge(status.a, status.aTime)}
                                        <span className="ml-2 text-xs text-[var(--color-text-muted)]">{pairLabelB}</span>
                                        {renderStatusBadge(status.b, status.bTime)}
                                        <span className="ml-2 text-xs text-[var(--color-text-muted)]">Judge</span>
                                        {renderJudgeBadge({
                                            isJudged: status.judged,
                                            isReady: status.a === 'complete' && status.b === 'complete' && !status.judged,
                                            status: { a: status.a, b: status.b },
                                        })}
                                    </div>
                                    {ev.judge?.scores ? (
                                        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                                                        <th className="px-3 py-2 text-left font-medium">Criterion</th>
                                                        <th className="px-3 py-2 text-center font-medium">{pairLabelA}</th>
                                                        <th className="px-3 py-2 text-center font-medium">{pairLabelB}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {config.criteria.map((criterion) => (
                                                        <tr key={criterion.id} className="border-b border-[var(--color-border)]/70">
                                                            <td className="px-3 py-2 text-[var(--color-text-primary)]">{criterion.name}</td>
                                                            <td className="px-3 py-2 text-center">{ev.judge.scores?.breakdown?.[criterion.id]?.A || 0}/5</td>
                                                            <td className="px-3 py-2 text-center">{ev.judge.scores?.breakdown?.[criterion.id]?.B || 0}/5</td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-[var(--color-bg-secondary)] font-medium">
                                                        <td className="px-3 py-2 text-[var(--color-text-primary)]">Total Score</td>
                                                        <td className="px-3 py-2 text-center">{ev.judge.scores.scoreA}/{maxScore}</td>
                                                        <td className="px-3 py-2 text-center">{ev.judge.scores.scoreB}/{maxScore}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : null}
                                    <div className="rounded-lg bg-[var(--color-bg-tertiary)] p-4 text-sm text-[var(--color-text-secondary)]">
                                        {ev.judge?.result || 'No judge output yet.'}
                                    </div>
                                </div>
                                </MotionDiv>
                            ) : null}
                            </AnimatePresence>
                        </div>
                    </div>
                    </MotionDiv>
                ) : null}
                </AnimatePresence>
            </Card>
            </MotionDiv>
        )
    }

    if (needsProviderConnection) {
        return (
            <div className="animate-fade-in mx-auto max-w-md py-20 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--color-warning)]/15 text-[var(--color-warning)]">
                    <AlertCircle size={28} strokeWidth={1.5} />
                </div>
                <h1 className="mb-2 text-xl font-semibold text-[var(--color-text-primary)]">
                    Provider Connection Required
                </h1>
                <p className="mb-8 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    Connect Gemini or Codex in Settings before running evaluations.
                </p>
                <Link to={settingsPath}>
                    <Button>Go to Settings</Button>
                </Link>
            </div>
        )
    }

    if (!isReadyToEvaluate) {
        return (
            <div className="animate-fade-in mx-auto max-w-md py-20 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--color-accent-subtle)] text-[var(--color-accent)]">
                    <Sliders size={28} strokeWidth={1.5} />
                </div>
                <h1 className="mb-2 text-xl font-semibold text-[var(--color-text-primary)]">
                    No Evaluation Configured
                </h1>
                <p className="mb-8 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    Set up your evaluation first, then upload skills and generate prompts.
                </p>
                <Link to={isV2 ? '/v2/configure' : '/configure'}>
                    <Button>
                        <Sliders size={16} strokeWidth={2} />
                        Configure Evaluation
                    </Button>
                </Link>
            </div>
        )
    }

    return (
        <div className={isV2 ? 'mx-auto max-w-[1320px]' : 'animate-fade-in'}>
            {isV2 ? null : (
                <>
                    <div className="mb-6">
                        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                            Evaluate
                        </h1>
                        <p className="text-[var(--color-text-secondary)]">
                            Run {config.prompts.length} prompts through your baseline and challengers, then judge the results
                        </p>
                    </div>

                    <Card className="mb-6 overflow-hidden p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                                    <History size={16} />
                                    Run History
                                </div>
                                <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
                                    {activeRunId ? `Active: ${activeRunName || activeRunId}` : 'No active saved run'}
                                </p>
                            </div>
                            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
                                <select
                                    value={currentSelectedRunId}
                                    onChange={(e) => setSelectedRunId(e.target.value)}
                                    className="min-w-0 max-w-full flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-primary)] sm:min-w-72 lg:max-w-xl"
                                >
                                    <option value="">Select a saved run</option>
                                    {runHistory.map((run) => (
                                        <option key={run.id} value={run.id}>
                                            {run.name} - {run.generatedCount}/{run.promptCount} generated, {run.judgedCount} judged - {formatDateTime(run.updatedAt)}
                                        </option>
                                    ))}
                                </select>
                                <Button variant="secondary" onClick={() => loadRun(currentSelectedRunId)} disabled={isBusy || !currentSelectedRunId}>
                                    Load
                                </Button>
                                <Button variant="ghost" onClick={() => deleteRun(currentSelectedRunId)} disabled={isBusy || !currentSelectedRunId}>
                                    <Trash2 size={16} />
                                    Delete
                                </Button>
                                <Button onClick={startNewRun} disabled={isBusy}>
                                    <Plus size={16} />
                                    Start Fresh Evaluation
                                </Button>
                            </div>
                        </div>
                        {historyError ? <p className="mt-3 text-sm text-[var(--color-error)]">{historyError}</p> : null}
                    </Card>
                </>
            )}

            {(config.outputType === 'visual' || config.outputType === 'both') && screenshotServerStatus && !screenshotServerStatus.available && (
                <Card className="mb-4 border-[var(--color-warning)] bg-[var(--color-warning)]/5 p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle size={20} className="mt-0.5 text-[var(--color-warning)]" />
                        <div className="flex-1">
                            <p className="mb-1 text-sm font-medium text-[var(--color-text-primary)]">
                                Screenshot server not running
                            </p>
                            <p className="mb-2 text-xs text-[var(--color-text-secondary)]">
                                Screenshot server unavailable. Continue with text-only evaluation, or run <code className="rounded bg-[var(--color-bg-tertiary)] px-1">node screenshot-server.js</code> to enable rendered screenshots.
                            </p>
                            <Button variant="ghost" size="sm" onClick={() => checkServerHealth().then(setScreenshotServerStatus)}>
                                <RefreshCw size={12} />
                                Check Again
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {isV2 && activeRunName ? (
                <div className="mb-4 min-w-0">
                    <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                        Current Run
                    </div>
                    <div className="mt-1 truncate text-sm font-medium text-[var(--color-text-primary)]">
                        {activeRunName}
                    </div>
                    {activeRunId ? (
                        <div className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
                            {activeRunId}
                        </div>
                    ) : null}
                </div>
            ) : null}

            {!isV2 && (
            <Card className="sticky top-4 z-20 mb-6 p-4">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                                    {activeRunName || 'Current Run'}
                                </h2>
                                <Badge variant={runError ? 'error' : runStatus === 'idle' ? 'default' : 'accent'}>
                                    {overallStatusText()}
                                </Badge>
                            </div>
                            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                                {comparisonStats.generatedCount}/{config.prompts.length} generated, {comparisonStats.judgedCount}/{config.prompts.length} judged
                                {startTime ? ` • ${formatTime(elapsedTime)} elapsed` : ''}
                            </p>
                            {isStopping ? (
                                <p className="mt-2 text-xs text-[var(--color-warning)]">
                                    Current batch will finish, then execution stops.
                                </p>
                            ) : null}
                        </div>
                        <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-2">
                            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-4 py-3">
                                <div className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                                    Output Generation Model
                                </div>
                                <div className="text-sm font-medium text-[var(--color-text-primary)]">
                                    {formatModelLabel(activeGenerationModel)}
                                </div>
                                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                    Controlled from Settings and used when generating outputs for the current skill set.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-4 py-3">
                                <div className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                                    Comparison Judge Model
                                </div>
                                <div className="text-sm font-medium text-[var(--color-text-primary)]">
                                    {formatModelLabel(activeJudgeModel)}
                                </div>
                                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                    Controlled from Settings and used when scoring the current baseline-versus-challenger view.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={() => runGenerations(activeGenerationModel)} disabled={isBusy}>
                            {runStatus === 'generating' ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    {isStopping ? 'Stopping...' : `Running (${progress.current}/${progress.total})`}
                                </>
                            ) : (
                                <>
                                    <Play size={16} />
                                    Run All
                                </>
                            )}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => runGenerations(activeGenerationModel, { resumeOnly: true })}
                            disabled={isBusy || evaluations.length === 0 || stats.generationRemainingCount === 0}
                        >
                            <RefreshCw size={16} />
                            Resume All
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => startJudging()}
                            disabled={isBusy || !stats.canJudge}
                        >
                            {runStatus === 'judging' ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    {isStopping ? 'Stopping...' : `Judging (${progress.current}/${progress.total})`}
                                </>
                            ) : (
                                <>
                                    <Scale size={16} />
                                    Judge All
                                </>
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={requestStop}
                            disabled={!['generating', 'judging'].includes(runStatus) || isStopping}
                        >
                            <StopCircle size={16} />
                            Stop after batch
                        </Button>
                        <Link to={settingsPath}>
                            <Button variant="ghost">
                                <Sliders size={16} />
                                Change in Settings
                            </Button>
                        </Link>
                    </div>
                    {runError ? <p className="text-sm text-[var(--color-error)]">{runError}</p> : null}
                </div>
            </Card>
            )}

            <div className={isV2 ? 'space-y-4' : ''}>
                {!isV2 ? (
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)]">
                        <div className="flex gap-1 overflow-x-auto">
                            <TabButton active={activeTab === 'run'} onClick={() => setActiveTab('run')}>
                                Run
                            </TabButton>
                            <TabButton active={activeTab === 'judge'} onClick={() => setActiveTab('judge')}>
                                Judge
                            </TabButton>
                            <TabButton active={activeTab === 'results'} onClick={() => setActiveTab('results')}>
                                Results
                            </TabButton>
                            <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')}>
                                Summary
                            </TabButton>
                            <TabButton active={activeTab === 'breakdown'} onClick={() => setActiveTab('breakdown')}>
                                Breakdown
                            </TabButton>
                        </div>
                        {challengerSkills.length > 1 ? (
                            <label className="mb-2 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                                <span>Compare Against</span>
                                <select
                                    value={currentChallengerSkill?.id || ''}
                                    onChange={(event) => setSelectedChallengerId(event.target.value)}
                                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
                                >
                                    {challengerSkills.map((skill) => (
                                        <option key={skill.id} value={skill.id}>
                                            {skill.filename || skill.id}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        ) : null}
                    </div>
                ) : null}

                <div className={isV2 ? 'space-y-4' : ''}>
                    {isV2 ? (
                        <>
                            <div ref={toolbarSentinelRef} aria-hidden="true" className="h-px w-full" />
                            <div
                                className={`sticky top-4 z-20 space-y-3 rounded-[1.25rem] border px-3 py-3 transition-[box-shadow,border-color,background-color,backdrop-filter] duration-200 ${
                                    isToolbarDetached
                                        ? 'border-[var(--color-border-hover)] bg-[var(--color-bg-primary)] shadow-[0_20px_48px_rgba(15,23,42,0.14)] backdrop-blur-xl'
                                        : 'border-transparent bg-transparent'
                                }`}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <LayoutGroup id="evaluate-v2-primary-tabs">
                                        <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-1">
                                            {[
                                                ['individual', 'Individual Analysis'],
                                                ['results', 'Results'],
                                            ].map(([id, label]) => {
                                                const isActive = activeTab === id
                                                return (
                                                    <button
                                                        key={id}
                                                        type="button"
                                                        onClick={() => setActiveTab(id)}
                                                        className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${isActive ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
                                                    >
                                                        {isActive ? (
                                                            <MotionSpan
                                                                layoutId="evaluate-v2-primary-tab"
                                                                className="absolute inset-0 rounded-lg bg-[var(--color-bg-primary)] shadow-[0_10px_22px_rgba(15,23,42,0.08)]"
                                                                transition={toolbarMotionTransition}
                                                            />
                                                        ) : null}
                                                        <span className="relative z-10">{label}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </LayoutGroup>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {challengerSkills.length > 1 ? (
                                            <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                                                <span>Compare Against</span>
                                                <select
                                                    value={currentChallengerSkill?.id || ''}
                                                    onChange={(event) => setSelectedChallengerId(event.target.value)}
                                                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
                                                >
                                                    {challengerSkills.map((skill) => (
                                                        <option key={skill.id} value={skill.id}>
                                                            {skill.filename || skill.id}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                        ) : null}
                                        <Button
                                            size="sm"
                                            className={`relative min-w-[132px] overflow-hidden ${
                                                toolbarTone === 'complete'
                                                    ? 'bg-emerald-600 shadow-md shadow-emerald-500/20 hover:bg-emerald-600/95 hover:shadow-lg hover:shadow-emerald-500/25'
                                                    : ''
                                            }`}
                                            onClick={toolbarPrimaryAction.action}
                                            disabled={toolbarPrimaryAction.disabled && toolbarPrimaryAction.key !== 'complete'}
                                        >
                                            {toolbarTone === 'running' && !prefersReducedMotion ? (
                                                <MotionSpan
                                                    aria-hidden="true"
                                                    className="absolute inset-y-0 left-0 rounded-[inherit] bg-white/14"
                                                    initial={false}
                                                    animate={{ width: `${Math.max(toolbarProgressRatio * 100, 12)}%` }}
                                                    transition={{ duration: 0.24, ease: MOTION_EASE_ENTER }}
                                                />
                                            ) : null}
                                            <span className="relative z-10 inline-flex items-center gap-2">
                                                <AnimatePresence initial={false} mode="wait">
                                                    <MotionSpan
                                                        key={`${toolbarPrimaryAction.key}-${toolbarPrimaryAction.label}`}
                                                        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                                                        transition={prefersReducedMotion ? REDUCED_MOTION_TRANSITION : { duration: 0.24, ease: MOTION_EASE_ENTER }}
                                                        className="inline-flex items-center gap-2"
                                                    >
                                                        <PrimaryToolbarIcon size={15} className={toolbarPrimaryAction.iconClassName || ''} />
                                                        {toolbarPrimaryAction.label}
                                                    </MotionSpan>
                                                </AnimatePresence>
                                            </span>
                                        </Button>
                                        {showStopAction ? (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="min-w-[88px]"
                                                onClick={requestStop}
                                                disabled={isStopping}
                                            >
                                                <StopCircle size={15} />
                                                Stop
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>
                                {(isStopping || runError || (activeTab === 'individual' && hasRunResults) || (!isBusy && toolbarPrimaryAction.key === 'complete' && !hasSelectedPrompts)) ? (
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="min-h-[24px] text-sm">
                                            {isStopping ? (
                                                <p className="text-[var(--color-warning)]">
                                                    Current batch will finish, then execution stops.
                                                </p>
                                            ) : runError ? (
                                                <p className="text-[var(--color-error)]">{runError}</p>
                                            ) : !isBusy && toolbarPrimaryAction.key === 'complete' && !hasSelectedPrompts ? (
                                                <p className="text-[var(--color-text-muted)]">
                                                    Select prompts in Individual Analysis to enable re-run.
                                                </p>
                                            ) : null}
                                        </div>
                                        {activeTab === 'individual' && hasRunResults ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-[var(--color-text-secondary)]">
                                                    {safeRunSelection.size} selected
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setRunSelection(allPromptsSelected ? new Set() : new Set(pairedEvaluations.map((ev) => ev.id)))}
                                                    disabled={pairedEvaluations.length === 0}
                                                    className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {allPromptsSelected ? 'Clear Selection' : 'Select All'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedResultIds(allResultsExpanded ? new Set() : new Set(pairedEvaluations.map((ev) => ev.id)))}
                                                    disabled={pairedEvaluations.length === 0}
                                                    className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {allResultsExpanded ? 'Collapse All' : 'Expand All'}
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                                {activeTab === 'results' ? (
                                    <LayoutGroup id="evaluate-v2-results-tabs">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-1">
                                                {[
                                                    ['summary', 'Summary'],
                                                    ['breakdown', 'Breakdown'],
                                                ].map(([id, label]) => {
                                                    const isActive = v2ResultsTab === id
                                                    return (
                                                        <button
                                                            key={id}
                                                            type="button"
                                                            onClick={() => setV2ResultsTab(id)}
                                                            className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${isActive ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
                                                        >
                                                            {isActive ? (
                                                                <MotionSpan
                                                                    layoutId="evaluate-v2-results-tab"
                                                                    className="absolute inset-0 rounded-lg bg-[var(--color-bg-primary)] shadow-[0_10px_22px_rgba(15,23,42,0.08)]"
                                                                    transition={toolbarMotionTransition}
                                                                />
                                                            ) : null}
                                                            <span className="relative z-10">{label}</span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </LayoutGroup>
                                ) : null}
                            </div>
                        </>
                    ) : null}

            {!isV2 && activeTab === 'run' && (
                <div className="space-y-4">
                    {!isV2 && (
                        <Card className="p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Run Queue</h2>
                                    <p className="text-sm text-[var(--color-text-secondary)]">
                                        {safeRunSelection.size} selected
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <select value={runFilter} onChange={(e) => setRunFilter(e.target.value)} className="min-w-40">
                                        <option value="all">All</option>
                                        <option value="pending">Pending</option>
                                        <option value="running">Running</option>
                                        <option value="complete">Complete</option>
                                        <option value="failed">Failed</option>
                                    </select>
                                    <Button
                                        variant="secondary"
                                        onClick={() => runGenerations(activeGenerationModel, { promptIndexes: runSelectedIndexes })}
                                        disabled={isBusy || safeRunSelection.size === 0}
                                    >
                                        <Play size={16} />
                                        Run Selected
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => runGenerations(activeGenerationModel, { promptIndexes: runSelectedIndexes, resumeOnly: true })}
                                        disabled={isBusy || runSelectedRemaining === 0}
                                    >
                                        <RefreshCw size={16} />
                                        Resume Selected
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => selectVisibleRows(setRunSelection, visibleRunRows)}
                                        disabled={visibleRunRows.length === 0}
                                    >
                                        Select visible
                                    </Button>
                                    <Button variant="ghost" onClick={() => setRunSelection(new Set())} disabled={safeRunSelection.size === 0}>
                                        Clear selection
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )}

                    {visibleRunRows.length === 0 ? (
                        <EmptyState
                            title="No prompts match this filter"
                            description="Change the filter or add prompts in Configure."
                        />
                    ) : (
                        <div className="space-y-2.5">
                            {visibleRunRows.map((row) => {
                                const selected = safeRunSelection.has(row.id)
                                const ev = pairedEvaluations[row.id - 1]
                                return (
                                    <Card key={row.id} className={`p-3.5 ${selected ? 'border-[var(--color-accent)]' : ''}`}>
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                                            <div className="flex items-start gap-3 lg:flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() => toggleSelection(setRunSelection, row.id)}
                                                    className="mt-1"
                                                />
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-bg-tertiary)] text-sm font-semibold text-[var(--color-text-muted)]">
                                                    {row.id}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    {editingPromptIdx === row.id - 1 ? (
                                                        <textarea
                                                            value={config.prompts[row.id - 1]}
                                                            onChange={(e) => updatePrompt(row.id - 1, e.target.value)}
                                                            onBlur={() => setEditingPromptIdx(null)}
                                                            autoFocus
                                                            rows={3}
                                                            className="w-full resize-none"
                                                        />
                                                    ) : (
                                                        <div className="flex items-start gap-2">
                                                            <p className="flex-1 text-[var(--color-text-primary)]">{row.prompt}</p>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingPromptIdx(row.id - 1)}
                                                                className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
                                                            >
                                                                <Edit3 size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1.5 lg:min-w-64">
                                                <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
                                                    <span className="text-[var(--color-text-muted)]">{pairLabelA}:</span>
                                                    {renderStatusBadge(row.status.a, row.status.aTime)}
                                                </div>
                                                <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
                                                    <span className="text-[var(--color-text-muted)]">{pairLabelB}:</span>
                                                    {renderStatusBadge(row.status.b, row.status.bTime)}
                                                </div>
                                                <div className="flex flex-wrap justify-end gap-2 pt-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => runGenerations(activeGenerationModel, { promptIndexes: [row.id - 1] })}
                                                        disabled={isBusy}
                                                    >
                                                        Run
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => runGenerations(activeGenerationModel, { promptIndexes: [row.id - 1], resumeOnly: true })}
                                                        disabled={isBusy || (ev && ev.resultA?.status === 'complete' && ev.resultB?.status === 'complete')}
                                                    >
                                                        Resume
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => showResultCard(row.id)}>
                                                        View Results
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {!isV2 && activeTab === 'judge' && (
                <div className="space-y-4">
                    {!isV2 && (
                        <Card className="p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Judge Queue</h2>
                                    <p className="text-sm text-[var(--color-text-secondary)]">
                                        {safeJudgeSelection.size} selected • {comparisonStats.readyToJudgeCount} ready to judge
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <select value={judgeFilter} onChange={(e) => setJudgeFilter(e.target.value)} className="min-w-44">
                                        <option value="all">All</option>
                                        <option value="ready">Ready</option>
                                        <option value="judged">Judged</option>
                                        <option value="waiting">Waiting</option>
                                    </select>
                                    <Button
                                        variant="secondary"
                                        onClick={() => startJudging({
                                            evaluationIds: judgeSelectedIds,
                                            challengerSkillIds: currentChallengerSkill ? [currentChallengerSkill.id] : undefined,
                                        })}
                                        disabled={isBusy || judgeSelectedIds.length === 0}
                                    >
                                        <Scale size={16} />
                                        Judge Selected
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => startJudging({
                                            challengerSkillIds: currentChallengerSkill ? [currentChallengerSkill.id] : undefined,
                                        })}
                                        disabled={isBusy || !comparisonStats.canJudge}
                                    >
                                        <RefreshCw size={16} />
                                        Resume Judging
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => selectVisibleRows(setJudgeSelection, visibleJudgeRows, (row) => row.isReady)}
                                        disabled={!visibleJudgeRows.some((row) => row.isReady)}
                                    >
                                        Select ready
                                    </Button>
                                    <Button variant="ghost" onClick={() => setJudgeSelection(new Set())} disabled={safeJudgeSelection.size === 0}>
                                        Clear selection
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )}

                    {visibleJudgeRows.length === 0 ? (
                        <EmptyState
                            title="No prompts match this filter"
                            description="Change the filter or run generations first."
                        />
                    ) : (
                        <div className="space-y-3">
                            {visibleJudgeRows.map((row) => {
                                const selected = safeJudgeSelection.has(row.id)
                                const ev = pairedEvaluations[row.id - 1]
                                return (
                                    <Card key={row.id} className={`p-4 ${selected ? 'border-[var(--color-accent)]' : ''}`}>
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                                            <div className="flex items-start gap-3 lg:flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() => toggleSelection(setJudgeSelection, row.id)}
                                                    disabled={!row.isReady}
                                                    className="mt-1"
                                                />
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-bg-tertiary)] text-sm font-semibold text-[var(--color-text-muted)]">
                                                    {row.id}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[var(--color-text-primary)]">{row.prompt}</p>
                                                    {!row.isReady && !row.isJudged ? (
                                                        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                                                            Waiting for both generated outputs before this eval can be judged.
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 lg:min-w-80">
                                                <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
                                                    <span className="text-[var(--color-text-muted)]">{pairLabelA}:</span>
                                                    {renderStatusBadge(row.status.a, row.status.aTime)}
                                                </div>
                                                <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
                                                    <span className="text-[var(--color-text-muted)]">{pairLabelB}:</span>
                                                    {renderStatusBadge(row.status.b, row.status.bTime)}
                                                </div>
                                                <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
                                                    <span className="text-[var(--color-text-muted)]">Judge:</span>
                                                    {renderJudgeBadge(row)}
                                                </div>
                                                <div className="flex flex-wrap justify-end gap-2 pt-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => startJudging({
                                                            evaluationIds: [row.id],
                                                            challengerSkillIds: currentChallengerSkill ? [currentChallengerSkill.id] : undefined,
                                                        })}
                                                        disabled={isBusy || !row.isReady}
                                                    >
                                                        Judge
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => showResultCard(row.id)}>
                                                        View Results
                                                    </Button>
                                                    {ev?.judge?.scores?.winner ? (
                                                        <Badge variant="accent" className="ml-auto">
                                                            Winner {ev.judge.scores.winner}
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {((!isV2 && activeTab === 'results') || (isV2 && activeTab === 'individual')) && (
                <div className="space-y-4">
                    {evaluations.length === 0 ? (
                        <EmptyState
                            title="No results yet"
                            description="Run at least one evaluation to review outputs and judge responses here."
                            action={
                                <Button onClick={() => runGenerations(activeGenerationModel)} disabled={isBusy}>
                                    <Play size={16} />
                                    Run All
                                </Button>
                            }
                        />
                    ) : (
                        isV2 ? (
                            <div className="space-y-1.5">
                                {pairedEvaluations.map((ev) => renderV2IndividualCard(ev))}
                            </div>
                        ) : (
                        <>
                            <Card className="p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Results Review</h2>
                                        <p className="text-sm text-[var(--color-text-secondary)]">
                                            Browse all results or inspect one evaluation in depth.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant={resultsViewMode === 'all' ? 'primary' : 'secondary'}
                                            onClick={() => setResultsViewMode('all')}
                                        >
                                            All Results
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={resultsViewMode === 'single' ? 'primary' : 'secondary'}
                                            onClick={() => {
                                                setResultsViewMode('single')
                                                setHighlightedResultId(safeSelectedResultId)
                                                setExpandedResultIds((current) => new Set(current).add(safeSelectedResultId))
                                            }}
                                        >
                                            Prompt Analysis
                                        </Button>
                                        {resultsViewMode === 'single' ? (
                                            <select
                                                value={safeSelectedResultId}
                                                onChange={(e) => {
                                                    const nextId = Number(e.target.value)
                                                    setSelectedResultId(nextId)
                                                    setHighlightedResultId(nextId)
                                                    setExpandedResultIds((current) => new Set(current).add(nextId))
                                                }}
                                                className="min-w-40"
                                            >
                                                {pairedEvaluations.map((ev) => (
                                                    <option key={ev.id} value={ev.id}>
                                                        Eval {ev.id}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : null}
                                    </div>
                                </div>
                            </Card>

                            {resultsViewMode === 'single'
                                ? renderResultCard(
                                    pairedEvaluations.find((ev) => ev.id === safeSelectedResultId) || pairedEvaluations[0],
                                    true,
                                    true,
                                )
                                : pairedEvaluations.map((ev) => renderResultCard(ev, safeExpandedResultIds.has(ev.id)))
                            }
                        </>
                        )
                    )}
                </div>
            )}

            {((!isV2 && activeTab === 'summary') || (isV2 && activeTab === 'results' && v2ResultsTab === 'summary')) && (
                <div className="space-y-4">
                    {judgedComparisons.length === 0 ? (
                        <EmptyState
                            title="No judged evaluations yet"
                            description="Run judgments to unlock the multi-skill leaderboard and challenger matchup summary."
                        />
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <Card className="p-4 text-center">
                                    <div className="text-3xl font-bold text-[var(--color-text-primary)]">{activeSkills.length}</div>
                                    <div className="text-xs text-[var(--color-text-muted)]">Skills Compared</div>
                                </Card>
                                <Card className="p-4 text-center">
                                    <div className="text-3xl font-bold text-[var(--color-text-primary)]">{judgedComparisons.length}</div>
                                    <div className="text-xs text-[var(--color-text-muted)]">Judged Matchups</div>
                                </Card>
                                <Card className="p-4 text-center">
                                    <div className="truncate text-lg font-semibold text-[var(--color-text-primary)]">{pairLabelA}</div>
                                    <div className="text-xs text-[var(--color-text-muted)]">Baseline</div>
                                </Card>
                                <Card className="p-4 text-center">
                                    <div className="truncate text-lg font-semibold text-[var(--color-text-primary)]">{leaderboardRows[0]?.name || '—'}</div>
                                    <div className="text-xs text-[var(--color-text-muted)]">Top Ranked</div>
                                </Card>
                            </div>

                            <Card className="p-6">
                                <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">Skill Leaderboard</h2>
                                <div className="max-h-[28rem] overflow-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[var(--color-border)]">
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-left font-medium text-[var(--color-text-muted)]">Rank</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-left font-medium text-[var(--color-text-muted)]">Skill</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-left font-medium text-[var(--color-text-muted)]">Role</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Wins</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Losses</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Ties</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Win Rate</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Avg Score</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Judged</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {leaderboardRows.map((row, index) => (
                                                <tr key={row.id} className="border-b border-[var(--color-border)]">
                                                    <td className="px-3 py-3 text-[var(--color-text-muted)]">{index + 1}</td>
                                                    <td className="max-w-xs truncate px-3 py-3 font-medium text-[var(--color-text-primary)]">{row.name}</td>
                                                    <td className="px-3 py-3 text-[var(--color-text-secondary)]">{row.role}</td>
                                                    <td className="px-3 py-3 text-center font-medium text-green-600">{row.wins}</td>
                                                    <td className="px-3 py-3 text-center font-medium text-[var(--color-error)]">{row.losses}</td>
                                                    <td className="px-3 py-3 text-center text-[var(--color-text-secondary)]">{row.ties}</td>
                                                    <td className="px-3 py-3 text-center text-[var(--color-text-secondary)]">{row.judged ? `${Math.round(row.winRate * 100)}%` : '—'}</td>
                                                    <td className="px-3 py-3 text-center text-[var(--color-text-secondary)]">{row.avgScore !== null ? `${row.avgScore.toFixed(1)}/${config.criteria.length * 5}` : '—'}</td>
                                                    <td className="px-3 py-3 text-center text-[var(--color-text-secondary)]">{row.judged}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>

                            <Card className="p-6">
                                <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">Challenger Matchups</h2>
                                <div className="max-h-[24rem] overflow-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[var(--color-border)]">
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-left font-medium text-[var(--color-text-muted)]">Challenger</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Judged</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">{pairLabelA} Wins</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Challenger Wins</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Ties</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">{pairLabelA} Avg</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Challenger Avg</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Leader</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {challengerSummaryRows.map((row) => (
                                                <tr key={row.id} className="border-b border-[var(--color-border)]">
                                                    <td className="max-w-xs truncate px-3 py-3 font-medium text-[var(--color-text-primary)]">{row.name}</td>
                                                    <td className="px-3 py-3 text-center text-[var(--color-text-secondary)]">{row.judged}</td>
                                                    <td className="px-3 py-3 text-center font-medium text-blue-600">{row.baselineWins}</td>
                                                    <td className="px-3 py-3 text-center font-medium text-orange-600">{row.challengerWins}</td>
                                                    <td className="px-3 py-3 text-center text-[var(--color-text-secondary)]">{row.ties}</td>
                                                    <td className="px-3 py-3 text-center text-[var(--color-text-secondary)]">{row.avgBaseline !== null ? row.avgBaseline.toFixed(1) : '—'}</td>
                                                    <td className="px-3 py-3 text-center text-[var(--color-text-secondary)]">{row.avgChallenger !== null ? row.avgChallenger.toFixed(1) : '—'}</td>
                                                    <td className="px-3 py-3 text-center font-medium text-[var(--color-text-primary)]">{row.leader}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </>
                    )}
                </div>
            )}

            {((!isV2 && activeTab === 'breakdown') || (isV2 && activeTab === 'results' && v2ResultsTab === 'breakdown')) && (
                <div className="space-y-4">
                    {judgedComparisons.length === 0 ? (
                        <EmptyState
                            title="No judged evaluations yet"
                            description="Run judgments to inspect multi-skill criterion trends and current-pair score details."
                        />
                    ) : (
                        <>
                            <Card className="p-6">
                                <button
                                    type="button"
                                    onClick={() => isV2 && toggleBreakdownCard('criterion-matrix')}
                                    className={`mb-4 flex w-full items-center justify-between gap-3 text-left ${isV2 ? '' : 'cursor-default'}`}
                                >
                                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Skill Criterion Matrix</h2>
                                    {isV2 ? (
                                        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2 text-[var(--color-text-muted)]">
                                            {isBreakdownCardCollapsed('criterion-matrix') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                                        </div>
                                    ) : null}
                                </button>
                                {!isV2 || !isBreakdownCardCollapsed('criterion-matrix') ? (
                                <div className="max-h-[24rem] overflow-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[var(--color-border)]">
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-left font-medium text-[var(--color-text-muted)]">Skill</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-left font-medium text-[var(--color-text-muted)]">Role</th>
                                                {config.criteria.map((criterion) => (
                                                    <th key={criterion.id} className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">
                                                        {criterion.name}
                                                    </th>
                                                ))}
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Overall Avg</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Judged</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {criterionMatrixRows.map((row) => (
                                                <tr key={row.id} className="border-b border-[var(--color-border)]">
                                                    <td className="max-w-xs truncate px-3 py-3 font-medium text-[var(--color-text-primary)]">{row.name}</td>
                                                    <td className="px-3 py-3 text-[var(--color-text-secondary)]">{row.role}</td>
                                                    {config.criteria.map((criterion) => (
                                                        <td key={criterion.id} className="px-3 py-3 text-center text-[var(--color-text-secondary)]">
                                                            {row.criteria[criterion.id] !== null ? row.criteria[criterion.id].toFixed(1) : '—'}
                                                        </td>
                                                    ))}
                                                    <td className="px-3 py-3 text-center font-medium text-[var(--color-text-primary)]">{row.avgScore !== null ? row.avgScore.toFixed(1) : '—'}</td>
                                                    <td className="px-3 py-3 text-center text-[var(--color-text-secondary)]">{row.judged}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                ) : null}
                            </Card>

                            <Card className="p-6">
                                <button
                                    type="button"
                                    onClick={() => isV2 && toggleBreakdownCard('criterion-leaders')}
                                    className={`mb-4 flex w-full items-center justify-between gap-3 text-left ${isV2 ? '' : 'cursor-default'}`}
                                >
                                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Criterion Leaders</h2>
                                    {isV2 ? (
                                        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2 text-[var(--color-text-muted)]">
                                            {isBreakdownCardCollapsed('criterion-leaders') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                                        </div>
                                    ) : null}
                                </button>
                                {!isV2 || !isBreakdownCardCollapsed('criterion-leaders') ? (
                                <div className="max-h-[24rem] overflow-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[var(--color-border)]">
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-left font-medium text-[var(--color-text-muted)]">Criterion</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-left font-medium text-[var(--color-text-muted)]">Leader</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Leader Avg</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-left font-medium text-[var(--color-text-muted)]">Runner-Up</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Runner-Up Avg</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {criterionLeaderRows.map((row) => (
                                                <tr key={row.id} className="border-b border-[var(--color-border)]">
                                                    <td className="px-3 py-3 text-[var(--color-text-primary)]">{row.name}</td>
                                                    <td className="max-w-xs truncate px-3 py-3 font-medium text-[var(--color-text-primary)]">{row.leaderName}</td>
                                                    <td className="px-3 py-3 text-center text-[var(--color-text-secondary)]">{row.leaderAvg !== null ? row.leaderAvg.toFixed(1) : '—'}</td>
                                                    <td className="max-w-xs truncate px-3 py-3 text-[var(--color-text-secondary)]">{row.runnerUpName}</td>
                                                    <td className="px-3 py-3 text-center text-[var(--color-text-secondary)]">{row.runnerUpAvg !== null ? row.runnerUpAvg.toFixed(1) : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                ) : null}
                            </Card>

                            <Card className="p-6">
                                <button
                                    type="button"
                                    onClick={() => isV2 && toggleBreakdownCard('score-details')}
                                    className={`mb-4 flex w-full items-center justify-between gap-3 text-left ${isV2 ? '' : 'cursor-default'}`}
                                >
                                    <div>
                                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Current Pair Score Details</h2>
                                        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                                            Showing {pairLabelA} vs {pairLabelB}
                                        </p>
                                    </div>
                                    {isV2 ? (
                                        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2 text-[var(--color-text-muted)]">
                                            {isBreakdownCardCollapsed('score-details') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                                        </div>
                                    ) : null}
                                </button>
                                {!isV2 || !isBreakdownCardCollapsed('score-details') ? (
                                <div className="max-h-[24rem] overflow-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[var(--color-border)]">
                                                <th className="sticky top-0 w-12 bg-[var(--color-bg-secondary)] px-2 py-2 text-center font-medium text-[var(--color-text-muted)]">Eval</th>
                                                {config.criteria.map((criterion) => (
                                                    <th key={criterion.id} className="sticky top-0 bg-[var(--color-bg-secondary)] px-2 py-2 text-center font-medium text-[var(--color-text-muted)]">
                                                        {criterion.name.split(' ')[0]}
                                                    </th>
                                                ))}
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-2 py-2 text-center font-medium text-[var(--color-text-muted)]">Total</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-2 py-2 text-center font-medium text-[var(--color-text-muted)]">Winner</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pairedEvaluations.filter((ev) => ev.judge.scores).map((ev) => {
                                                const scores = ev.judge.scores
                                                const maxScore = config.criteria.length * 5
                                                return (
                                                    <React.Fragment key={ev.id}>
                                                        <tr className={`border-b border-[var(--color-border)]/50 ${scores.winner === 'A' ? 'bg-blue-500/5' : ''}`}>
                                                            <td rowSpan={2} className="border-r border-[var(--color-border)] px-2 py-2 text-center font-medium">{ev.id}</td>
                                                            {config.criteria.map((criterion) => {
                                                                const score = scores.breakdown?.[criterion.id]?.A || 0
                                                                const bScore = scores.breakdown?.[criterion.id]?.B || 0
                                                                return (
                                                                    <td key={`${criterion.id}-a`} className={`px-2 py-2 text-center ${score > bScore ? 'bg-blue-500/20 font-medium' : ''}`}>
                                                                        {score}
                                                                    </td>
                                                                )
                                                            })}
                                                            <td className="px-2 py-2 text-center font-medium">{scores.scoreA}/{maxScore}</td>
                                                            <td rowSpan={2} className={`border-l border-[var(--color-border)] px-2 py-2 text-center text-lg font-bold ${scores.winner === 'A' ? 'bg-blue-500/10 text-blue-600' : scores.winner === 'B' ? 'bg-orange-500/10 text-orange-600' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'}`}>
                                                                {scores.winner === 'tie' ? 'TIE' : scores.winner}
                                                            </td>
                                                        </tr>
                                                        <tr className={`border-b border-[var(--color-border)] ${scores.winner === 'B' ? 'bg-orange-500/5' : ''}`}>
                                                            {config.criteria.map((criterion) => {
                                                                const score = scores.breakdown?.[criterion.id]?.B || 0
                                                                const aScore = scores.breakdown?.[criterion.id]?.A || 0
                                                                return (
                                                                    <td key={`${criterion.id}-b`} className={`px-2 py-2 text-center ${score > aScore ? 'bg-orange-500/20 font-medium' : ''}`}>
                                                                        {score}
                                                                    </td>
                                                                )
                                                            })}
                                                            <td className="px-2 py-2 text-center font-medium">{scores.scoreB}/{maxScore}</td>
                                                        </tr>
                                                    </React.Fragment>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                ) : null}
                            </Card>
                        </>
                    )}
                </div>
            )}
                </div>
            </div>

            <AnimatePresence initial={false}>
                {showExportActions ? (
                    <MotionDiv
                        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                        transition={prefersReducedMotion ? REDUCED_MOTION_TRANSITION : { duration: 0.18, ease: MOTION_EASE_ENTER }}
                        className="mt-6 flex justify-end gap-2 border-t border-[var(--color-border)] pt-6"
                    >
                        <Button variant="secondary" onClick={exportAsCSV} disabled={pairedEvaluations.length === 0}>
                            <Download size={16} />
                            Export CSV
                        </Button>
                        <Button variant="secondary" onClick={exportAsJSON} disabled={pairedEvaluations.length === 0}>
                            <Download size={16} />
                            Export JSON
                        </Button>
                    </MotionDiv>
                ) : null}
            </AnimatePresence>
        </div>
    )
}

export default EvaluateView
