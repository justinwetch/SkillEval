import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { History, Plus, Trash2 } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import { useEvalRun } from '../contexts/EvalRunContext'

function formatDateTime(value) {
    if (!value) return ''
    return new Date(value).toLocaleString()
}

function HistoryView() {
    const navigate = useNavigate()
    const {
        runStatus,
        activeRunId,
        runHistory,
        historyError,
        startNewRun,
        loadRun,
        deleteRun,
    } = useEvalRun()
    const [selectedRunId, setSelectedRunId] = useState('')

    const currentSelectedRunId = selectedRunId || activeRunId || ''
    const selectedRun = useMemo(
        () => runHistory.find((run) => run.id === currentSelectedRunId) || null,
        [currentSelectedRunId, runHistory],
    )
    const isBusy = runStatus !== 'idle'

    const handleFreshEvaluation = () => {
        startNewRun()
        navigate('/v2/configure')
    }

    const handleLoad = (runId) => {
        loadRun(runId)
        navigate('/v2/evaluate')
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                        History
                    </div>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                        Saved Evaluation Runs
                    </h1>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                        Reload previous runs, remove old snapshots, or start a fresh evaluation.
                    </p>
                </div>
                <Button onClick={handleFreshEvaluation} disabled={isBusy}>
                    <Plus size={16} />
                    Start Fresh Evaluation
                </Button>
            </div>

            {runHistory.length === 0 ? (
                <Card className="p-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-accent-subtle)] text-[var(--color-accent)]">
                        <History size={22} />
                    </div>
                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">No saved runs yet</h2>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                        Run an evaluation and it will appear here automatically as progress is saved.
                    </p>
                    <div className="mt-5">
                        <Link to="/v2/configure">
                            <Button>
                                <Plus size={16} />
                                Configure Evaluation
                            </Button>
                        </Link>
                    </div>
                </Card>
            ) : (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_360px]">
                    <Card className="overflow-hidden p-0">
                        <div className="border-b border-[var(--color-border)] px-5 py-4">
                            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                                Run List
                            </h2>
                        </div>
                        <div className="divide-y divide-[var(--color-border)]">
                            {runHistory.map((run) => {
                                const isActive = run.id === activeRunId
                                const isSelected = run.id === currentSelectedRunId
                                return (
                                    <button
                                        key={run.id}
                                        type="button"
                                        onClick={() => setSelectedRunId(run.id)}
                                        className={`flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors ${isSelected ? 'bg-[var(--color-accent-subtle)]' : 'hover:bg-[var(--color-bg-secondary)]'}`}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                                                    {run.name}
                                                </div>
                                                {isActive ? <Badge variant="accent">Active</Badge> : null}
                                            </div>
                                            <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                                                {run.generatedCount}/{run.promptCount} generated, {run.judgedCount} judged
                                            </div>
                                            <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                                                Updated {formatDateTime(run.updatedAt)}
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-xs text-[var(--color-text-muted)]">
                                            {formatDateTime(run.createdAt)}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </Card>

                    <Card className="p-5">
                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                            Selected Run
                        </div>
                        {selectedRun ? (
                            <div className="mt-3 space-y-4">
                                <div>
                                    <div className="text-base font-semibold text-[var(--color-text-primary)]">
                                        {selectedRun.name}
                                    </div>
                                    <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                                        {selectedRun.generatedCount}/{selectedRun.promptCount} generated, {selectedRun.judgedCount} judged
                                    </div>
                                    <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                                        Updated {formatDateTime(selectedRun.updatedAt)}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Button className="w-full" onClick={() => handleLoad(selectedRun.id)} disabled={isBusy}>
                                        Load in Evaluate
                                    </Button>
                                    <Button variant="ghost" className="w-full" onClick={() => deleteRun(selectedRun.id)} disabled={isBusy}>
                                        <Trash2 size={15} />
                                        Delete Run
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-3 text-sm text-[var(--color-text-secondary)]">
                                Select a saved run to load it into Evaluate.
                            </div>
                        )}
                        {historyError ? (
                            <p className="mt-4 text-sm text-[var(--color-error)]">{historyError}</p>
                        ) : null}
                    </Card>
                </div>
            )}
        </div>
    )
}

export default HistoryView
