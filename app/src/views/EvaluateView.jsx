import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    Play,
    Scale,
    Sliders,
    AlertCircle,
    Loader2,
    CheckCircle2,
    XCircle,
    Clock,
    Trophy,
    ChevronDown,
    ChevronUp,
    Download,
    RefreshCw,
    Edit3,
    Shuffle
} from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import { useSettings } from '../contexts/SettingsContext'
import { useEvalConfig } from '../contexts/EvalConfigContext'
import { useEvalRun } from '../contexts/EvalRunContext'
import { checkServerHealth } from '../utils/screenshot'

function EvaluateView() {
    const { needsApiKey } = useSettings()
    const { config, isReadyToEvaluate, updatePrompt } = useEvalConfig()
    const {
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
    } = useEvalRun()

    const [activeTab, setActiveTab] = useState('summary')
    const [promptsExpanded, setPromptsExpanded] = useState(true)
    const [showAllPrompts, setShowAllPrompts] = useState(false)
    const [editingPromptIdx, setEditingPromptIdx] = useState(null)
    const [screenshotServerStatus, setScreenshotServerStatus] = useState(null)
    const [generationModel, setGenerationModel] = useState('claude-sonnet-4-5-20250929')
    const [judgeModel, setJudgeModel] = useState('claude-opus-4-5-20251101')

    // Check screenshot server on mount and when output type changes
    useEffect(() => {
        if (config.outputType === 'visual' || config.outputType === 'both') {
            checkServerHealth().then(setScreenshotServerStatus)
        }
    }, [config.outputType])

    // Format elapsed time
    const formatTime = (ms) => {
        if (!ms) return '0s'
        const seconds = Math.floor(ms / 1000)
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        if (mins > 0) return `${mins}m ${secs}s`
        return `${secs}s`
    }

    // Export results as JSON
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
                ties: stats.judgedCount - stats.aWins - stats.bWins
            },
            evaluations: evaluations.map(ev => ({
                id: ev.id,
                prompt: ev.prompt,
                resultA: { content: ev.resultA.content, elapsed: ev.resultA.elapsed },
                resultB: { content: ev.resultB.content, elapsed: ev.resultB.elapsed },
                judge: ev.judge.scores ? {
                    winner: ev.judge.scores.winner,
                    scoreA: ev.judge.scores.scoreA,
                    scoreB: ev.judge.scores.scoreB,
                    breakdown: ev.judge.scores.breakdown,
                    reasoning: ev.judge.result
                } : null
            }))
        }
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `skill-eval-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    // Export results as CSV
    const exportAsCSV = () => {
        const headers = ['ID', 'Prompt', 'Winner', 'Score A', 'Score B', ...config.criteria.map(c => `${c.name} (A)`), ...config.criteria.map(c => `${c.name} (B)`)]
        const rows = evaluations.map(ev => {
            const scores = ev.judge.scores
            const criteriaScoresA = config.criteria.map(c => scores?.breakdown?.[c.id]?.A || '')
            const criteriaScoresB = config.criteria.map(c => scores?.breakdown?.[c.id]?.B || '')
            return [
                ev.id,
                `"${ev.prompt.replace(/"/g, '""')}"`,
                scores?.winner || '',
                scores?.scoreA || '',
                scores?.scoreB || '',
                ...criteriaScoresA,
                ...criteriaScoresB
            ]
        })
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `skill-eval-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    // Calculate elapsed time for display
    const elapsedTime = startTime ? (endTime || Date.now()) - startTime : 0

    // Get status for a prompt based on evaluations
    const getPromptStatus = (idx) => {
        if (evaluations.length === 0) return { a: 'pending', b: 'pending' }
        const ev = evaluations[idx]
        if (!ev) return { a: 'pending', b: 'pending' }
        return {
            a: ev.resultA?.status || 'pending',
            b: ev.resultB?.status || 'pending',
            aTime: ev.resultA?.elapsed,
            bTime: ev.resultB?.elapsed,
            judged: ev.judge?.status === 'complete'
        }
    }

    // API key required state
    if (needsApiKey) {
        return (
            <div className="animate-fade-in max-w-md mx-auto text-center py-20">
                <div className="w-14 h-14 rounded-xl bg-[var(--color-warning)]/15 flex items-center justify-center text-[var(--color-warning)] mx-auto mb-5">
                    <AlertCircle size={28} strokeWidth={1.5} />
                </div>
                <h1 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
                    API Key Required
                </h1>
                <p className="text-[var(--color-text-secondary)] text-sm mb-8 leading-relaxed">
                    You need to add an Anthropic API key before you can run evaluations.
                </p>
                <Link to="/settings">
                    <Button>Go to Settings</Button>
                </Link>
            </div>
        )
    }

    // No config state
    if (!isReadyToEvaluate) {
        return (
            <div className="animate-fade-in max-w-md mx-auto text-center py-20">
                <div className="w-14 h-14 rounded-xl bg-[var(--color-accent-subtle)] flex items-center justify-center text-[var(--color-accent)] mx-auto mb-5">
                    <Sliders size={28} strokeWidth={1.5} />
                </div>
                <h1 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
                    No Evaluation Configured
                </h1>
                <p className="text-[var(--color-text-secondary)] text-sm mb-8 leading-relaxed">
                    Set up your evaluation first — upload skills, generate criteria and prompts.
                </p>
                <Link to="/configure">
                    <Button>
                        <Sliders size={16} strokeWidth={2} />
                        Configure Evaluation
                    </Button>
                </Link>
            </div>
        )
    }

    // Render status badge
    const renderStatusBadge = (status, time) => {
        const timeStr = time ? ` (${formatTime(time)})` : ''
        switch (status) {
            case 'complete':
                return (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-600">
                        <CheckCircle2 size={12} />Complete{timeStr}
                    </span>
                )
            case 'error':
                return (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-600">
                        <XCircle size={12} />Error
                    </span>
                )
            case 'running':
                return (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-600">
                        <Loader2 size={12} className="animate-spin" />Running
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                        <Clock size={12} />
                        Pending
                    </span>
                )
        }
    }

    // Prompts to display
    const displayPrompts = showAllPrompts ? config.prompts : config.prompts.slice(0, 10)

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-2">
                    Evaluate
                </h1>
                <p className="text-[var(--color-text-secondary)]">
                    Run {config.prompts.length} prompts through both skills and judge the results
                </p>
            </div>

            {/* Screenshot Server Warning */}
            {(config.outputType === 'visual' || config.outputType === 'both') && screenshotServerStatus && !screenshotServerStatus.available && (
                <Card className="p-4 mb-4 border-[var(--color-warning)] bg-[var(--color-warning)]/5">
                    <div className="flex items-start gap-3">
                        <AlertCircle size={20} className="text-[var(--color-warning)] mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                                Screenshot server not running
                            </p>
                            <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                                Visual judging requires the screenshot server. Run: <code className="bg-[var(--color-bg-tertiary)] px-1 rounded">node screenshot-server.js</code>
                            </p>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => checkServerHealth().then(setScreenshotServerStatus)}
                            >
                                <RefreshCw size={12} />
                                Check Again
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Evaluation Prompts Section */}
            <Card className="p-6 mb-6">
                {/* Collapsible Header */}
                <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setPromptsExpanded(!promptsExpanded)}
                >
                    <div className="flex items-center gap-3">
                        {promptsExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                            Evaluation Prompts
                        </h2>
                        <span className="text-sm text-[var(--color-text-muted)]">
                            {config.prompts.length} prompts
                        </span>
                    </div>
                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        {/* Model Selector */}
                        <select
                            value={generationModel}
                            onChange={(e) => setGenerationModel(e.target.value)}
                            className="text-sm px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[#F5E6D3] text-[#2D2018] font-medium"
                        >
                            <option value="claude-haiku-4-5-20251001">Haiku 4.5</option>
                            <option value="claude-sonnet-4-5-20250929">Sonnet 4.5</option>
                            <option value="claude-opus-4-5-20251101">Opus 4.5</option>
                        </select>
                        {/* Run All Button */}
                        <Button
                            onClick={() => runGenerations(generationModel)}
                            disabled={runStatus !== 'idle'}
                        >
                            {runStatus === 'generating' ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Running ({progress.current}/{progress.total})
                                </>
                            ) : (
                                <>
                                    <Play size={16} />
                                    Run All Evals
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {runError && (
                    <p className="text-sm text-[var(--color-error)] mt-4">{runError}</p>
                )}

                {/* Eval Rows - Collapsible */}
                {promptsExpanded && (
                    <>
                        <div className="space-y-2 mt-4">
                            {displayPrompts.map((prompt, idx) => {
                                const status = getPromptStatus(idx)
                                const ev = evaluations[idx]

                                return (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-4 p-4 bg-[var(--color-bg-tertiary)] rounded-lg border border-[var(--color-border)]"
                                    >
                                        {/* Number */}
                                        <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-secondary)] flex items-center justify-center font-semibold text-sm">
                                            {idx + 1}
                                        </div>

                                        {/* Prompt Text */}
                                        <div className="flex-1 min-w-0">
                                            {editingPromptIdx === idx ? (
                                                <textarea
                                                    value={prompt}
                                                    onChange={(e) => updatePrompt(idx, e.target.value)}
                                                    onBlur={() => setEditingPromptIdx(null)}
                                                    onKeyDown={(e) => e.key === 'Escape' && setEditingPromptIdx(null)}
                                                    autoFocus
                                                    rows={3}
                                                    className="w-full text-sm p-2 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)]"
                                                />
                                            ) : (
                                                <p
                                                    className="text-sm text-[var(--color-text-primary)] cursor-pointer hover:text-[var(--color-accent)]"
                                                    onClick={() => setEditingPromptIdx(idx)}
                                                >
                                                    {prompt}
                                                    <Edit3 size={12} className="inline ml-2 opacity-50" />
                                                </p>
                                            )}
                                        </div>

                                        {/* Status Badges */}
                                        <div className="flex flex-col items-end gap-1 flex-shrink-0 min-w-[140px]">
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-[var(--color-text-muted)] w-4">A:</span>
                                                {renderStatusBadge(status.a, status.aTime)}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-[var(--color-text-muted)] w-4">B:</span>
                                                {renderStatusBadge(status.b, status.bTime)}
                                            </div>
                                            {status.judged && (
                                                <span className="text-xs text-[var(--color-text-muted)]">
                                                    Judged: {formatTime(ev?.judge?.elapsed)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Show More/Less */}
                        {config.prompts.length > 10 && (
                            <button
                                onClick={() => setShowAllPrompts(!showAllPrompts)}
                                className="w-full mt-4 py-2 text-sm text-[var(--color-accent)] hover:underline flex items-center justify-center gap-2"
                            >
                                {showAllPrompts ? (
                                    <>
                                        <ChevronUp size={16} />
                                        Show fewer prompts
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown size={16} />
                                        Show all {config.prompts.length} prompts
                                    </>
                                )}
                            </button>
                        )}
                    </>
                )}
            </Card>

            {/* Judge All & Timer Bar */}
            <Card className="p-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Judge Model Selector */}
                        <select
                            value={judgeModel}
                            onChange={(e) => setJudgeModel(e.target.value)}
                            className="text-sm px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[#F5E6D3] text-[#2D2018] font-medium"
                        >
                            <option value="claude-haiku-4-5-20251001">Haiku 4.5</option>
                            <option value="claude-sonnet-4-5-20250929">Sonnet 4.5</option>
                            <option value="claude-opus-4-5-20251101">Opus 4.5</option>
                        </select>
                        <Button
                            onClick={() => runJudgments(judgeModel)}
                            disabled={runStatus !== 'idle' || !stats.canJudge}
                        >
                            {runStatus === 'judging' ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Judging ({progress.current}/{progress.total})
                                </>
                            ) : (
                                <>
                                    <Scale size={16} />
                                    Judge All
                                </>
                            )}
                        </Button>
                        <Button variant="ghost" onClick={clearRunState}>
                            Clear All
                        </Button>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 text-sm text-[var(--color-text-secondary)]">
                        {startTime && (
                            <div className="flex items-center gap-2">
                                <Clock size={14} />
                                {formatTime(elapsedTime)}
                            </div>
                        )}
                        <span>Generated: <strong className="text-[var(--color-text-primary)]">{stats.generatedCount}/{stats.totalEvals}</strong></span>
                        <span>Judged: <strong className="text-[var(--color-text-primary)]">{stats.judgedCount}/{stats.totalEvals}</strong></span>
                    </div>
                </div>
            </Card>

            {/* Results Section - Only show if we have evaluations */}
            {evaluations.length > 0 && (
                <>
                    {/* Tabs */}
                    <div className="flex gap-1 mb-4 border-b border-[var(--color-border)] overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('summary')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors -mb-px ${activeTab === 'summary'
                                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                                }`}
                        >
                            Summary
                        </button>
                        <button
                            onClick={() => setActiveTab('breakdown')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors -mb-px ${activeTab === 'breakdown'
                                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                                }`}
                        >
                            Detailed Breakdown
                        </button>
                        {evaluations.slice(0, 10).map((ev) => (
                            <button
                                key={ev.id}
                                onClick={() => setActiveTab(`eval-${ev.id}`)}
                                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors -mb-px ${activeTab === `eval-${ev.id}`
                                    ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                                    }`}
                            >
                                Eval {ev.id}
                            </button>
                        ))}
                        {evaluations.length > 10 && (
                            <span className="px-4 py-2 text-sm text-[var(--color-text-muted)]">
                                +{evaluations.length - 10} more
                            </span>
                        )}
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'summary' && (
                        <Card className="p-6">
                            {/* Overall Results */}
                            {stats.judgedCount > 0 && (
                                <div className="flex gap-6 mb-6 flex-wrap">
                                    <div className={`text-center p-4 rounded-lg ${stats.aWins > stats.bWins ? 'bg-blue-500/10' : 'bg-[var(--color-bg-tertiary)]'}`}>
                                        <div className="text-3xl font-bold text-blue-500">{stats.aWins}</div>
                                        <div className="text-xs text-[var(--color-text-muted)]">Skill A Wins</div>
                                    </div>
                                    <div className={`text-center p-4 rounded-lg ${stats.bWins > stats.aWins ? 'bg-orange-500/10' : 'bg-[var(--color-bg-tertiary)]'}`}>
                                        <div className="text-3xl font-bold text-orange-500">{stats.bWins}</div>
                                        <div className="text-xs text-[var(--color-text-muted)]">Skill B Wins</div>
                                    </div>
                                    <div className="text-center p-4 rounded-lg bg-[var(--color-bg-tertiary)]">
                                        <div className="text-3xl font-bold text-[var(--color-text-muted)]">{stats.judgedCount - stats.aWins - stats.bWins}</div>
                                        <div className="text-xs text-[var(--color-text-muted)]">Ties</div>
                                    </div>
                                </div>
                            )}

                            {/* Summary Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--color-border)]">
                                            <th className="text-left py-2 px-3 text-[var(--color-text-muted)] font-medium">Eval</th>
                                            <th className="text-left py-2 px-3 text-[var(--color-text-muted)] font-medium">Prompt</th>
                                            <th className="text-center py-2 px-3 text-[var(--color-text-muted)] font-medium">Skill A Score</th>
                                            <th className="text-center py-2 px-3 text-[var(--color-text-muted)] font-medium">Skill B Score</th>
                                            <th className="text-center py-2 px-3 text-[var(--color-text-muted)] font-medium">Winner</th>
                                            <th className="text-center py-2 px-3 text-[var(--color-text-muted)] font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {evaluations.map((ev) => {
                                            const maxScore = config.criteria.length * 5
                                            return (
                                                <tr
                                                    key={ev.id}
                                                    className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)] cursor-pointer"
                                                    onClick={() => setActiveTab(`eval-${ev.id}`)}
                                                >
                                                    <td className="py-3 px-3 text-[var(--color-text-muted)]">{ev.id}</td>
                                                    <td className="py-3 px-3 text-[var(--color-text-primary)] max-w-xs truncate">{ev.prompt.slice(0, 60)}...</td>
                                                    <td className={`py-3 px-3 text-center font-medium ${ev.judge.scores?.winner === 'A' ? 'bg-blue-500/10 text-blue-600' : ''}`}>
                                                        {ev.judge.scores?.scoreA ? `${ev.judge.scores.scoreA}/${maxScore}` : '-'}
                                                    </td>
                                                    <td className={`py-3 px-3 text-center font-medium ${ev.judge.scores?.winner === 'B' ? 'bg-orange-500/10 text-orange-600' : ''}`}>
                                                        {ev.judge.scores?.scoreB ? `${ev.judge.scores.scoreB}/${maxScore}` : '-'}
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        {ev.judge.scores?.winner && (
                                                            <span className={`font-bold ${ev.judge.scores.winner === 'A' ? 'text-blue-500' : ev.judge.scores.winner === 'B' ? 'text-orange-500' : 'text-gray-500'}`}>
                                                                {ev.judge.scores.winner === 'A' ? 'A' : ev.judge.scores.winner === 'B' ? 'B' : 'TIE'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3 text-center text-[var(--color-text-muted)]">
                                                        {ev.judge.status === 'complete' ? 'Judged' :
                                                            ev.resultA.status === 'complete' && ev.resultB.status === 'complete' ? 'Ready' :
                                                                'Pending'}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'breakdown' && (
                        <Card className="p-6">
                            {stats.judgedCount === 0 ? (
                                <p className="text-[var(--color-text-muted)] text-center py-8">
                                    Run judgments to see per-criterion breakdown
                                </p>
                            ) : (
                                <>
                                    {/* Per-Criterion Summary */}
                                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                                        Per-Criterion Summary
                                    </h3>
                                    <div className="overflow-x-auto mb-8">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-[var(--color-border)]">
                                                    <th className="text-left py-2 px-3 text-[var(--color-text-muted)] font-medium">Criterion</th>
                                                    <th className="text-center py-2 px-3 text-[var(--color-text-muted)] font-medium">Skill A Wins</th>
                                                    <th className="text-center py-2 px-3 text-[var(--color-text-muted)] font-medium">Skill B Wins</th>
                                                    <th className="text-center py-2 px-3 text-[var(--color-text-muted)] font-medium">Ties</th>
                                                    <th className="text-center py-2 px-3 text-[var(--color-text-muted)] font-medium">Avg Score A</th>
                                                    <th className="text-center py-2 px-3 text-[var(--color-text-muted)] font-medium">Avg Score B</th>
                                                    <th className="text-center py-2 px-3 text-[var(--color-text-muted)] font-medium">Leader</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {config.criteria.map(criterion => {
                                                    let aWins = 0, bWins = 0, ties = 0, aTotal = 0, bTotal = 0, count = 0;
                                                    evaluations.forEach(ev => {
                                                        const breakdown = ev.judge.scores?.breakdown?.[criterion.id];
                                                        if (breakdown) {
                                                            count++;
                                                            aTotal += breakdown.A || 0;
                                                            bTotal += breakdown.B || 0;
                                                            if ((breakdown.A || 0) > (breakdown.B || 0)) aWins++;
                                                            else if ((breakdown.B || 0) > (breakdown.A || 0)) bWins++;
                                                            else ties++;
                                                        }
                                                    });
                                                    const avgA = count > 0 ? (aTotal / count).toFixed(1) : '-';
                                                    const avgB = count > 0 ? (bTotal / count).toFixed(1) : '-';
                                                    const leader = aWins > bWins ? 'A' : bWins > aWins ? 'B' : '-';

                                                    return (
                                                        <tr key={criterion.id} className="border-b border-[var(--color-border)]">
                                                            <td className="py-3 px-3 text-[var(--color-text-primary)]">{criterion.name}</td>
                                                            <td className="py-3 px-3 text-center font-medium text-blue-500">{aWins}</td>
                                                            <td className="py-3 px-3 text-center font-medium text-orange-500">{bWins}</td>
                                                            <td className="py-3 px-3 text-center text-[var(--color-text-muted)]">{ties}</td>
                                                            <td className="py-3 px-3 text-center text-[var(--color-text-secondary)]">{avgA}/5</td>
                                                            <td className="py-3 px-3 text-center text-[var(--color-text-secondary)]">{avgB}/5</td>
                                                            <td className={`py-3 px-3 text-center font-bold ${leader === 'A' ? 'text-blue-500' : leader === 'B' ? 'text-orange-500' : ''}`}>
                                                                {leader}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Score Details Per Evaluation */}
                                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                                        Score Details Per Evaluation
                                    </h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-[var(--color-border)]">
                                                    <th className="text-center py-2 px-2 text-[var(--color-text-muted)] font-medium w-12">Eval</th>
                                                    {config.criteria.map(c => (
                                                        <th key={c.id} className="text-center py-2 px-2 text-[var(--color-text-muted)] font-medium">{c.name.split(' ')[0]}</th>
                                                    ))}
                                                    <th className="text-center py-2 px-2 text-[var(--color-text-muted)] font-medium">Total</th>
                                                    <th className="text-center py-2 px-2 text-[var(--color-text-muted)] font-medium">Winner</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {evaluations.filter(ev => ev.judge.scores).map(ev => {
                                                    const scores = ev.judge.scores;
                                                    const maxScore = config.criteria.length * 5;
                                                    return (
                                                        <React.Fragment key={ev.id}>
                                                            {/* Row A */}
                                                            <tr className={`border-b border-[var(--color-border)]/50 ${scores.winner === 'A' ? 'bg-blue-500/5' : ''}`}>
                                                                <td rowSpan={2} className="text-center py-2 px-2 border-r border-[var(--color-border)] font-medium">{ev.id}</td>
                                                                {config.criteria.map(c => {
                                                                    const score = scores.breakdown?.[c.id]?.A || 0;
                                                                    const bScore = scores.breakdown?.[c.id]?.B || 0;
                                                                    const isWinner = score > bScore;
                                                                    return (
                                                                        <td key={c.id} className={`text-center py-2 px-2 ${isWinner ? 'bg-blue-500/20 font-medium' : ''}`}>
                                                                            {score}
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td className="text-center py-2 px-2 font-medium">{scores.scoreA}/{maxScore}</td>
                                                                <td rowSpan={2} className={`text-center py-2 px-2 border-l border-[var(--color-border)] font-bold text-lg ${scores.winner === 'A' ? 'bg-blue-500/10 text-blue-600' : scores.winner === 'B' ? 'bg-orange-500/10 text-orange-600' : 'bg-gray-100'}`}>
                                                                    {scores.winner === 'A' ? 'A' : scores.winner === 'B' ? 'B' : 'TIE'}
                                                                </td>
                                                            </tr>
                                                            {/* Row B */}
                                                            <tr className={`border-b border-[var(--color-border)] ${scores.winner === 'B' ? 'bg-orange-500/5' : ''}`}>
                                                                {config.criteria.map(c => {
                                                                    const score = scores.breakdown?.[c.id]?.B || 0;
                                                                    const aScore = scores.breakdown?.[c.id]?.A || 0;
                                                                    const isWinner = score > aScore;
                                                                    return (
                                                                        <td key={c.id} className={`text-center py-2 px-2 ${isWinner ? 'bg-orange-500/20 font-medium' : ''}`}>
                                                                            {score}
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td className="text-center py-2 px-2 font-medium">{scores.scoreB}/{maxScore}</td>
                                                            </tr>
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </Card>
                    )}

                    {activeTab.startsWith('eval-') && (
                        <Card className="p-6">
                            {(() => {
                                const evalId = parseInt(activeTab.split('-')[1]);
                                const ev = evaluations.find(e => e.id === evalId);
                                if (!ev) return <p>Evaluation not found</p>;

                                return (
                                    <div className="space-y-6">
                                        {/* Prompt */}
                                        <div>
                                            <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">Prompt</h3>
                                            <p className="text-[var(--color-text-primary)] bg-[var(--color-bg-tertiary)] p-3 rounded-lg">
                                                {ev.prompt}
                                            </p>
                                        </div>

                                        {/* Results side by side */}
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Result A */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="text-sm font-medium text-[var(--color-text-muted)]">
                                                        Result A ({config.skillA.filename || 'Skill A'})
                                                    </h3>
                                                    {ev.judge.scores?.winner === 'A' && (
                                                        <Trophy size={14} className="text-blue-500" />
                                                    )}
                                                </div>
                                                <div className="bg-[var(--color-bg-tertiary)] p-3 rounded-lg text-xs font-mono max-h-64 overflow-auto whitespace-pre-wrap">
                                                    {ev.resultA.error ? (
                                                        <span className="text-[var(--color-error)]">{ev.resultA.error}</span>
                                                    ) : (
                                                        ev.resultA.content || <span className="text-[var(--color-text-muted)]">Pending...</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Result B */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="text-sm font-medium text-[var(--color-text-muted)]">
                                                        Result B ({config.skillB.filename || 'Skill B'})
                                                    </h3>
                                                    {ev.judge.scores?.winner === 'B' && (
                                                        <Trophy size={14} className="text-orange-500" />
                                                    )}
                                                </div>
                                                <div className="bg-[var(--color-bg-tertiary)] p-3 rounded-lg text-xs font-mono max-h-64 overflow-auto whitespace-pre-wrap">
                                                    {ev.resultB.error ? (
                                                        <span className="text-[var(--color-error)]">{ev.resultB.error}</span>
                                                    ) : (
                                                        ev.resultB.content || <span className="text-[var(--color-text-muted)]">Pending...</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Judge Result */}
                                        {ev.judge.result && (
                                            <div>
                                                <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">Judge Evaluation</h3>
                                                <div className="bg-[var(--color-bg-tertiary)] p-4 rounded-lg text-sm max-h-96 overflow-auto whitespace-pre-wrap">
                                                    {ev.judge.result}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </Card>
                    )}
                </>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-2 mt-6 pt-6 border-t border-[var(--color-border)]">
                <Button
                    variant="secondary"
                    onClick={exportAsCSV}
                    disabled={evaluations.length === 0}
                >
                    <Download size={16} />
                    Export CSV
                </Button>
                <Button
                    variant="secondary"
                    onClick={exportAsJSON}
                    disabled={evaluations.length === 0}
                >
                    <Download size={16} />
                    Export JSON
                </Button>
            </div>
        </div>
    )
}

export default EvaluateView
