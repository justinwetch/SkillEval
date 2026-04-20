import React, { useEffect, useState } from 'react'
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
                        {isWinner && <Trophy size={14} className={winnerClassName} />}
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
    const [collapsedJudgeIds, setCollapsedJudgeIds] = useState(() => (
        isV2 ? new Set(config.prompts.map((_, idx) => idx + 1)) : new Set()
    ))
    const [collapsedBreakdownCards, setCollapsedBreakdownCards] = useState(new Set())

    const needsProviderConnection = connectedProviders.length === 0

    useEffect(() => {
        if (config.outputType === 'visual' || config.outputType === 'both') {
            checkServerHealth().then(setScreenshotServerStatus)
        }
    }, [config.outputType])

    useEffect(() => {
        if (activeTab !== 'results' || !highlightedResultId) return
        const element = document.getElementById(`result-card-${highlightedResultId}`)
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }, [activeTab, highlightedResultId])

    useEffect(() => {
        if (!startTime || endTime) return undefined
        const intervalId = window.setInterval(() => {
            setClockMs(Date.now())
        }, 1000)
        return () => window.clearInterval(intervalId)
    }, [startTime, endTime])

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
            skillA: config.skillA.filename,
            skillB: config.skillB.filename,
            criteria: config.criteria,
            summary: {
                total: stats.totalEvals,
                judged: stats.judgedCount,
                aWins: stats.aWins,
                bWins: stats.bWins,
                ties: stats.judgedCount - stats.aWins - stats.bWins,
            },
            evaluations: evaluations.map((ev) => ({
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
        const headers = ['ID', 'Prompt', 'Winner', 'Score A', 'Score B', ...config.criteria.map((c) => `${c.name} (A)`), ...config.criteria.map((c) => `${c.name} (B)`)]
        const rows = evaluations.map((ev) => {
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

    const getPromptStatus = (idx) => {
        const ev = evaluations[idx]
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
    const hasRunResults = evaluations.some((ev) => (
        ['running', 'complete', 'error'].includes(ev?.resultA?.status)
        || ['running', 'complete', 'error'].includes(ev?.resultB?.status)
    ))
    const runSelectedRemaining = runSelectedIndexes.filter((idx) => {
        const ev = evaluations[idx]
        return !ev || ev.resultA?.status !== 'complete' || ev.resultB?.status !== 'complete'
    }).length
    const judgeSelectedIds = [...safeJudgeSelection].filter((id) => {
        const ev = evaluations[id - 1]
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

    const allPromptsSelected = evaluations.length > 0 && safeRunSelection.size === evaluations.length
    const allResultsExpanded = evaluations.length > 0 && safeExpandedResultIds.size === evaluations.length
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
            label: stats.judgedCount > 0 ? 'Judged' : 'Run Complete',
            icon: CheckCircle2,
            action: undefined,
            disabled: true,
        }
    })()
    const PrimaryToolbarIcon = toolbarPrimaryAction.icon

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
                Waiting for A/B generation
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
                                    title="Result A"
                                    filename={config.skillA.filename || 'Skill A'}
                                    isWinner={winner === 'A'}
                                    winnerClassName="text-blue-500"
                                    result={ev.resultA}
                                />
                                <ResultPanel
                                    title="Result B"
                                    filename={config.skillB.filename || 'Skill B'}
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

        return (
            <Card
                key={ev.id}
                id={`result-card-${ev.id}`}
                className={`${highlightedResultId === ev.id ? 'border-[var(--color-accent)]' : ''} overflow-hidden p-0`}
            >
                <div className="flex items-start gap-3 px-5 py-4">
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelection(setRunSelection, ev.id)}
                        aria-label={`Select eval ${ev.id}`}
                        className="mt-1"
                    />
                    <button
                        type="button"
                        onClick={() => toggleResultExpanded(ev.id)}
                        className="flex min-w-0 flex-1 items-start justify-between gap-4 text-left"
                    >
                        <div className="min-w-0">
                            <div className="flex min-w-0 flex-wrap items-start gap-3">
                                <div className="flex shrink-0 items-center gap-2 pt-1">
                                    <Badge>{`Eval ${ev.id}`}</Badge>
                                    {selected ? <Badge variant="default">Selected</Badge> : null}
                                </div>
                                <div className="min-w-0 flex-1 text-lg leading-8">
                                    {renderPromptWithEmphasis(ev.prompt)}
                                </div>
                            </div>
                        </div>
                        <div className="shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2 text-[var(--color-text-muted)]">
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                    </button>
                </div>

                {expanded ? (
                    <div className="space-y-5 border-t border-[var(--color-border)] px-5 py-5">
                        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                            <ResultPanel
                                title="Result A"
                                filename={config.skillA.filename || 'Skill A'}
                                isWinner={winner === 'A'}
                                winnerClassName="text-blue-500"
                                result={ev.resultA}
                                panelClassName={winner === 'A' ? 'rounded-2xl border border-blue-500/35 bg-blue-500/5 p-3 shadow-[0_0_0_1px_rgba(59,130,246,0.08),0_18px_48px_rgba(59,130,246,0.16)]' : 'rounded-2xl border border-[var(--color-border)]/70 p-3'}
                            />
                            <ResultPanel
                                title="Result B"
                                filename={config.skillB.filename || 'Skill B'}
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
                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                            >
                                <div>
                                    <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                                        Judge Evaluation
                                    </div>
                                    <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                                        Collapsed by default to keep the review surface compact.
                                    </div>
                                </div>
                                <div className="text-[var(--color-text-muted)]">
                                    {judgeCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                                </div>
                            </button>

                            {!judgeCollapsed ? (
                                <div className="space-y-4 border-t border-[var(--color-border)] px-4 py-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs text-[var(--color-text-muted)]">Model A</span>
                                        {renderStatusBadge(status.a, status.aTime)}
                                        <span className="ml-2 text-xs text-[var(--color-text-muted)]">Model B</span>
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
                                                        <th className="px-3 py-2 text-center font-medium">Result A</th>
                                                        <th className="px-3 py-2 text-center font-medium">Result B</th>
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
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </Card>
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
        <div className="animate-fade-in">
            {isV2 ? null : (
                <>
                    <div className="mb-6">
                        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                            Evaluate
                        </h1>
                        <p className="text-[var(--color-text-secondary)]">
                            Run {config.prompts.length} prompts through both skills and judge the results
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
                                Visual judging requires the screenshot server. Run: <code className="rounded bg-[var(--color-bg-tertiary)] px-1">node screenshot-server.js</code>
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
                                {stats.generatedCount}/{config.prompts.length} generated, {stats.judgedCount}/{config.prompts.length} judged
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
                                    Controlled from Settings and used when running prompts through both skills.
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
                                    Controlled from Settings and used when scoring A versus B.
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
                            onClick={() => runJudgments(activeJudgeModel)}
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
                    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-[var(--color-border)]">
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
                ) : null}

                <div className={isV2 ? 'space-y-4' : ''}>
                    {isV2 ? (
                        <>
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    <Button
                                        size="sm"
                                        className="min-w-[132px]"
                                        variant={toolbarPrimaryAction.key === 'complete' ? 'secondary' : 'primary'}
                                        onClick={toolbarPrimaryAction.action}
                                        disabled={toolbarPrimaryAction.disabled}
                                    >
                                        <PrimaryToolbarIcon size={15} className={toolbarPrimaryAction.iconClassName || ''} />
                                        {toolbarPrimaryAction.label}
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
                                {(isStopping || runError) ? (
                                    <div className="space-y-1 text-right">
                                        {isStopping ? (
                                            <p className="text-sm text-[var(--color-warning)]">
                                                Current batch will finish, then execution stops.
                                            </p>
                                        ) : null}
                                        {runError ? <p className="text-sm text-[var(--color-error)]">{runError}</p> : null}
                                    </div>
                                ) : null}
                                {!isBusy && toolbarPrimaryAction.key === 'complete' && !hasSelectedPrompts ? (
                                    <div className="text-right text-sm text-[var(--color-text-muted)]">
                                        Select prompts in Individual Analysis to enable re-run.
                                    </div>
                                ) : null}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-1">
                                    {[
                                        ['summary', 'Summary'],
                                        ['breakdown', 'Breakdown'],
                                        ['individual', 'Individual Analysis'],
                                    ].map(([id, label]) => (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setActiveTab(id)}
                                            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === id ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                {activeTab === 'individual' ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-[var(--color-text-secondary)]">
                                            {safeRunSelection.size} selected
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setRunSelection(allPromptsSelected ? new Set() : new Set(evaluations.map((ev) => ev.id)))}
                                            disabled={evaluations.length === 0}
                                            className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {allPromptsSelected ? 'Clear Selection' : 'Select All'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setExpandedResultIds(allResultsExpanded ? new Set() : new Set(evaluations.map((ev) => ev.id)))}
                                            disabled={evaluations.length === 0}
                                            className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {allResultsExpanded ? 'Collapse All' : 'Expand All'}
                                        </button>
                                    </div>
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
                                const ev = evaluations[row.id - 1]
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
                                                    <span className="text-[var(--color-text-muted)]">A:</span>
                                                    {renderStatusBadge(row.status.a, row.status.aTime)}
                                                </div>
                                                <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
                                                    <span className="text-[var(--color-text-muted)]">B:</span>
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
                                        {safeJudgeSelection.size} selected • {stats.judgmentRemainingCount} ready to judge
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
                                        onClick={() => runJudgments(activeJudgeModel, { evaluationIds: judgeSelectedIds })}
                                        disabled={isBusy || judgeSelectedIds.length === 0}
                                    >
                                        <Scale size={16} />
                                        Judge Selected
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => runJudgments(activeJudgeModel)}
                                        disabled={isBusy || !stats.canJudge}
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
                                const ev = evaluations[row.id - 1]
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
                                                    <span className="text-[var(--color-text-muted)]">A:</span>
                                                    {renderStatusBadge(row.status.a, row.status.aTime)}
                                                </div>
                                                <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
                                                    <span className="text-[var(--color-text-muted)]">B:</span>
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
                                                        onClick={() => runJudgments(activeJudgeModel, { evaluationIds: [row.id] })}
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
                            evaluations.map((ev) => renderV2IndividualCard(ev))
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
                                                {evaluations.map((ev) => (
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
                                    evaluations.find((ev) => ev.id === safeSelectedResultId) || evaluations[0],
                                    true,
                                    true,
                                )
                                : evaluations.map((ev) => renderResultCard(ev, safeExpandedResultIds.has(ev.id)))
                            }
                        </>
                        )
                    )}
                </div>
            )}

            {activeTab === 'summary' && (
                <div className="space-y-4">
                    {stats.judgedCount === 0 ? (
                        <EmptyState
                            title="No judged evaluations yet"
                            description="Run judgments to unlock overall winner summaries and score comparisons."
                        />
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <Card className={`p-4 text-center ${stats.aWins > stats.bWins ? 'bg-blue-500/10' : ''}`}>
                                    <div className="text-3xl font-bold text-blue-500">{stats.aWins}</div>
                                    <div className="text-xs text-[var(--color-text-muted)]">Skill A Wins</div>
                                </Card>
                                <Card className={`p-4 text-center ${stats.bWins > stats.aWins ? 'bg-orange-500/10' : ''}`}>
                                    <div className="text-3xl font-bold text-orange-500">{stats.bWins}</div>
                                    <div className="text-xs text-[var(--color-text-muted)]">Skill B Wins</div>
                                </Card>
                                <Card className="p-4 text-center">
                                    <div className="text-3xl font-bold text-[var(--color-text-primary)]">{stats.judgedCount - stats.aWins - stats.bWins}</div>
                                    <div className="text-xs text-[var(--color-text-muted)]">Ties</div>
                                </Card>
                                <Card className="p-4 text-center">
                                    <div className="text-3xl font-bold text-[var(--color-text-primary)]">{stats.judgedCount}</div>
                                    <div className="text-xs text-[var(--color-text-muted)]">Judged Evals</div>
                                </Card>
                            </div>

                            <Card className="p-6">
                                <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">Evaluation Summary</h2>
                                <div className="max-h-[28rem] overflow-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[var(--color-border)]">
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-left font-medium text-[var(--color-text-muted)]">Eval</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-left font-medium text-[var(--color-text-muted)]">Prompt</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Skill A Score</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Skill B Score</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Winner</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {evaluations.map((ev) => {
                                                const maxScore = config.criteria.length * 5
                                                return (
                                                    <tr
                                                        key={ev.id}
                                                        className="cursor-pointer border-b border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)]"
                                                        onClick={() => {
                                                            setSelectedResultId(ev.id)
                                                            showResultCard(ev.id)
                                                            if (!isV2) {
                                                                setResultsViewMode('single')
                                                            }
                                                        }}
                                                    >
                                                        <td className="px-3 py-3 text-[var(--color-text-muted)]">{ev.id}</td>
                                                        <td className="max-w-xs truncate px-3 py-3 text-[var(--color-text-primary)]">{ev.prompt}</td>
                                                        <td className={`px-3 py-3 text-center font-medium ${ev.judge.scores?.winner === 'A' ? 'bg-blue-500/10 text-blue-600' : ''}`}>
                                                            {ev.judge.scores?.scoreA ? `${ev.judge.scores.scoreA}/${maxScore}` : '-'}
                                                        </td>
                                                        <td className={`px-3 py-3 text-center font-medium ${ev.judge.scores?.winner === 'B' ? 'bg-orange-500/10 text-orange-600' : ''}`}>
                                                            {ev.judge.scores?.scoreB ? `${ev.judge.scores.scoreB}/${maxScore}` : '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-center">
                                                            {ev.judge.scores?.winner ? (
                                                                <span className={`font-bold ${ev.judge.scores.winner === 'A' ? 'text-blue-500' : ev.judge.scores.winner === 'B' ? 'text-orange-500' : 'text-[var(--color-text-muted)]'}`}>
                                                                    {ev.judge.scores.winner}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[var(--color-text-muted)]">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-3 text-center text-[var(--color-text-muted)]">
                                                            {ev.judge.status === 'complete'
                                                                ? 'Judged'
                                                                : ev.resultA.status === 'complete' && ev.resultB.status === 'complete'
                                                                    ? 'Ready'
                                                                    : 'Pending'}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </>
                    )}
                </div>
            )}

            {activeTab === 'breakdown' && (
                <div className="space-y-4">
                    {stats.judgedCount === 0 ? (
                        <EmptyState
                            title="No judged evaluations yet"
                            description="Run judgments to inspect per-criterion scoring breakdowns."
                        />
                    ) : (
                        <>
                            <Card className="p-6">
                                <button
                                    type="button"
                                    onClick={() => isV2 && toggleBreakdownCard('criterion-summary')}
                                    className={`mb-4 flex w-full items-center justify-between gap-3 text-left ${isV2 ? '' : 'cursor-default'}`}
                                >
                                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Per-Criterion Summary</h2>
                                    {isV2 ? (
                                        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2 text-[var(--color-text-muted)]">
                                            {isBreakdownCardCollapsed('criterion-summary') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                                        </div>
                                    ) : null}
                                </button>
                                {!isV2 || !isBreakdownCardCollapsed('criterion-summary') ? (
                                <div className="max-h-[24rem] overflow-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[var(--color-border)]">
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-left font-medium text-[var(--color-text-muted)]">Criterion</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Skill A Wins</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Skill B Wins</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Ties</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Avg Score A</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Avg Score B</th>
                                                <th className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-2 text-center font-medium text-[var(--color-text-muted)]">Leader</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {config.criteria.map((criterion) => {
                                                let aWins = 0
                                                let bWins = 0
                                                let ties = 0
                                                let aTotal = 0
                                                let bTotal = 0
                                                let count = 0

                                                evaluations.forEach((ev) => {
                                                    const breakdown = ev.judge.scores?.breakdown?.[criterion.id]
                                                    if (breakdown) {
                                                        count += 1
                                                        aTotal += breakdown.A || 0
                                                        bTotal += breakdown.B || 0
                                                        if ((breakdown.A || 0) > (breakdown.B || 0)) aWins += 1
                                                        else if ((breakdown.B || 0) > (breakdown.A || 0)) bWins += 1
                                                        else ties += 1
                                                    }
                                                })

                                                const avgA = count > 0 ? (aTotal / count).toFixed(1) : '-'
                                                const avgB = count > 0 ? (bTotal / count).toFixed(1) : '-'
                                                const leader = aWins > bWins ? 'A' : bWins > aWins ? 'B' : '-'

                                                return (
                                                    <tr key={criterion.id} className="border-b border-[var(--color-border)]">
                                                        <td className="px-3 py-3 text-[var(--color-text-primary)]">{criterion.name}</td>
                                                        <td className="px-3 py-3 text-center font-medium text-blue-500">{aWins}</td>
                                                        <td className="px-3 py-3 text-center font-medium text-orange-500">{bWins}</td>
                                                        <td className="px-3 py-3 text-center text-[var(--color-text-muted)]">{ties}</td>
                                                        <td className="px-3 py-3 text-center text-[var(--color-text-secondary)]">{avgA}/5</td>
                                                        <td className="px-3 py-3 text-center text-[var(--color-text-secondary)]">{avgB}/5</td>
                                                        <td className={`px-3 py-3 text-center font-bold ${leader === 'A' ? 'text-blue-500' : leader === 'B' ? 'text-orange-500' : ''}`}>
                                                            {leader}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
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
                                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Score Details Per Evaluation</h2>
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
                                            {evaluations.filter((ev) => ev.judge.scores).map((ev) => {
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

            <div className="mt-6 flex justify-end gap-2 border-t border-[var(--color-border)] pt-6">
                <Button variant="secondary" onClick={exportAsCSV} disabled={evaluations.length === 0}>
                    <Download size={16} />
                    Export CSV
                </Button>
                <Button variant="secondary" onClick={exportAsJSON} disabled={evaluations.length === 0}>
                    <Download size={16} />
                    Export JSON
                </Button>
            </div>
        </div>
    )
}

export default EvaluateView
