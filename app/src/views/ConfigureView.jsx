import { useState, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    ArrowRight,
    Upload,
    Wand2,
    Check,
    X,
    Plus,
    Loader2,
    FileText,
    Trash2,
    Edit3,
    RefreshCw,
    ChevronDown,
    ChevronUp
} from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import { useEvalConfig } from '../contexts/EvalConfigContext'
import { useEvalRun } from '../contexts/EvalRunContext'

function ConfigureView({ variant = 'classic' }) {
    const isV2 = variant === 'v2'
    const navigate = useNavigate()
    const {
        config,
        isGenerating,
        generationError,
        setSkill,
        setOutputType,
        removeCriterion,
        addCriterion,
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
    } = useEvalConfig()
    const { clearRunState } = useEvalRun()

    const [expandedCriterion, setExpandedCriterion] = useState(null)
    const [editingPrompt, setEditingPrompt] = useState(null)
    const [newPromptText, setNewPromptText] = useState('')
    const [showAllPrompts, setShowAllPrompts] = useState(false)
    const [showNewRunConfirm, setShowNewRunConfirm] = useState(false)
    const [activeSetupStep, setActiveSetupStep] = useState('skills')
    const [activeConfigSection, setActiveConfigSection] = useState('output')

    const fileInputARef = useRef(null)
    const fileInputBRef = useRef(null)

    // Handle file upload
    const handleFileUpload = useCallback(async (side, file) => {
        if (!file) return

        const content = await file.text()
        setSkill(side, {
            filename: file.name,
            content
        })
    }, [setSkill])

    // Handle drag and drop
    const handleDrop = useCallback((side) => (e) => {
        e.preventDefault()
        e.stopPropagation()
        const file = e.dataTransfer?.files?.[0]
        if (file && (file.name.endsWith('.md') || file.type === 'text/markdown' || file.type === 'text/plain')) {
            handleFileUpload(side, file)
        }
    }, [handleFileUpload])

    const handleDragOver = (e) => {
        e.preventDefault()
        e.stopPropagation()
    }

    // Determine step completion
    const providerConnectionStepComplete = true
    const skillsComplete = hasSkills
    const configComplete = config.criteria.length > 0 && config.prompts.length > 0
    const resolvedActiveStep = activeSetupStep === 'config' && !skillsComplete ? 'skills' : activeSetupStep

    // Prompts to display (limited unless expanded)
    const displayPrompts = showAllPrompts ? config.prompts : config.prompts.slice(0, 5)

    const resetCurrentRun = () => {
        clearConfig()
        clearRunState()
        setExpandedCriterion(null)
        setEditingPrompt(null)
        setNewPromptText('')
        setShowAllPrompts(false)
        setShowNewRunConfirm(false)
    }

    const handleStartNewRun = () => {
        const hasCurrentWork = hasSkills || config.criteria.length > 0 || config.prompts.length > 0
        if (hasCurrentWork) {
            setShowNewRunConfirm(true)
            return
        }

        resetCurrentRun()
    }

    const setupSteps = [
        {
            id: 'provider',
            title: 'Provider',
            description: 'Connection managed in Settings',
            complete: providerConnectionStepComplete,
        },
        {
            id: 'skills',
            title: 'Skills',
            description: skillsComplete ? `${config.skillA.filename} vs ${config.skillB.filename}` : 'Upload two skills',
            complete: skillsComplete,
        },
        {
            id: 'config',
            title: 'Config',
            description: configComplete ? `${config.criteria.length} criteria • ${config.prompts.length} prompts` : 'Criteria and prompts',
            complete: configComplete,
            disabled: !skillsComplete,
        },
    ]

    const configSections = [
        { id: 'output', label: 'Output Type' },
        { id: 'criteria', label: 'Criteria' },
        { id: 'prompts', label: 'Prompts' },
        { id: 'ready', label: 'Ready' },
    ]
    const activeConfigSectionIndex = configSections.findIndex((section) => section.id === activeConfigSection)
    const previousConfigSection = activeConfigSectionIndex > 0 ? configSections[activeConfigSectionIndex - 1] : null
    const nextConfigSection = activeConfigSectionIndex >= 0 && activeConfigSectionIndex < configSections.length - 1
        ? configSections[activeConfigSectionIndex + 1]
        : null

    const switchConfigSection = (sectionId) => {
        setActiveConfigSection(sectionId)
    }

    return (
        <div className="animate-fade-in max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-2">
                        Configure Evaluation
                    </h1>
                    <p className="text-[var(--color-text-secondary)]">
                        Upload skills, then generate or customize your evaluation criteria
                    </p>
                </div>
                <Button variant="ghost" onClick={handleStartNewRun}>
                    <Plus size={16} />
                    Start New Run
                </Button>
            </div>

            <div className="mb-4">
                <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2">
                    {setupSteps.map((step, index) => (
                        <button
                            key={step.id}
                            type="button"
                            onClick={() => !step.disabled && setActiveSetupStep(step.id)}
                            disabled={step.disabled}
                            className={`rounded-xl px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${resolvedActiveStep === step.id
                                ? 'bg-[var(--color-bg-primary)] shadow-sm'
                                : 'hover:bg-[var(--color-bg-tertiary)]'
                                }`}
                        >
                            <div className="mb-1 flex items-center gap-2">
                                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${step.complete ? 'bg-[var(--color-success)] text-white' : resolvedActiveStep === step.id ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'}`}>
                                    {step.complete ? <Check size={13} strokeWidth={2.6} /> : index + 1}
                                </span>
                                <span className="text-sm font-semibold text-[var(--color-text-primary)]">{step.title}</span>
                            </div>
                            <div className="truncate text-xs text-[var(--color-text-muted)]">{step.description}</div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
                {providerConnectionStepComplete ? <Badge variant="success">Provider Managed</Badge> : null}
                {skillsComplete ? <Badge variant="success">Skills Ready</Badge> : null}
                {configComplete ? <Badge variant="success">Config Ready</Badge> : null}
            </div>

            {resolvedActiveStep === 'provider' ? (
                <Card padding="none" className="p-6 mb-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                                Provider Connection
                            </h2>
                            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                                Gemini or Codex credentials are managed by the local llm-hub sidecar.
                            </p>
                            <p className="mt-4 text-sm text-[var(--color-text-muted)]">
                                Configure providers once in Settings, then return here to upload skills and generate prompts.
                            </p>
                        </div>
                        <Link to="/v2/settings">
                            <Button variant="secondary">Open Settings</Button>
                        </Link>
                    </div>
                </Card>
            ) : null}

            {resolvedActiveStep === 'skills' ? (
                <Card padding="none" className={`p-6 mb-4 ${!providerConnectionStepComplete ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="mb-6 flex items-start gap-4">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)] text-sm font-semibold text-[#FFFFFF]">
                                2
                            </div>
                            <div className="flex-1">
                                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                                    Upload Skills
                                </h2>
                                <p className="text-sm text-[var(--color-text-secondary)]">
                                    Upload two skill files to compare.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {['A', 'B'].map((side) => {
                                const skill = side === 'A' ? config.skillA : config.skillB
                                const fileInputRef = side === 'A' ? fileInputARef : fileInputBRef
                                const hasContent = !!skill.content

                                return (
                                    <div
                                        key={side}
                                        onClick={() => !hasContent && fileInputRef.current?.click()}
                                        onDrop={handleDrop(side)}
                                        onDragOver={handleDragOver}
                                        className={`
                                            border rounded-lg p-5 text-center transition-all
                                            ${hasContent
                                                ? 'border-[var(--color-success)] bg-[var(--color-success)]/5'
                                                : 'border-dashed border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-elevated)] cursor-pointer'
                                            }
                                        `}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".md,.txt"
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(side, e.target.files?.[0])}
                                        />

                                        {hasContent ? (
                                            <div className="flex items-center justify-between">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <FileText size={18} className="text-[var(--color-success)] flex-shrink-0" />
                                                    <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                                                        {skill.filename}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSkill(side, { filename: '', content: '' })
                                                    }}
                                                    className="rounded p-1 hover:bg-[var(--color-bg-tertiary)]"
                                                >
                                                    <X size={16} className="text-[var(--color-text-muted)]" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload size={20} className="mx-auto mb-2 text-[var(--color-text-muted)]" strokeWidth={1.5} />
                                                <div className="mb-0.5 text-sm font-medium text-[var(--color-text-primary)]">
                                                    Skill {side}
                                                </div>
                                                <div className="text-xs text-[var(--color-text-muted)]">
                                                    Drop file or click
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </Card>
            ) : null}

            {resolvedActiveStep === 'config' ? (
                <Card padding="none" className={`p-6 mb-4 ${!skillsComplete ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-start gap-4 mb-6">
                    <div className={`
                        w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0
                        ${configComplete
                            ? 'bg-[var(--color-success)] text-[#FFFFFF]'
                            : skillsComplete
                                ? 'bg-[var(--color-accent)] text-[#FFFFFF]'
                                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
                        }
                    `}>
                        {configComplete ? <Check size={16} strokeWidth={2.5} /> : '3'}
                    </div>
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
                                    3. Configure Evaluation
                                </h2>
                                <p className="text-sm text-[var(--color-text-secondary)]">
                                    Choose output type, refine criteria, and preview prompts before running.
                                </p>
                            </div>
                            <Button
                                onClick={() => generateAll(false)}
                                disabled={isGenerating || !skillsComplete}
                                variant="secondary"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 size={16} />
                                        Generate from Skills
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
                {generationError && (
                    <p className="mb-4 text-sm text-[var(--color-error)]">{generationError}</p>
                )}

                <div className="mb-6 overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2">
                    <div className="flex min-w-max items-center gap-2">
                        {configSections.map((section) => (
                            <button
                                key={section.id}
                                type="button"
                                onClick={() => switchConfigSection(section.id)}
                                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${activeConfigSection === section.id
                                    ? 'bg-[var(--color-accent)] text-white'
                                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
                                    }`}
                            >
                                {section.label}
                            </button>
                        ))}
                    </div>
                </div>

                {activeConfigSection === 'output' ? (
                <div className="mb-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-5">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Output Type</h3>
                    </div>
                    <div className="flex gap-2">
                        {['text', 'visual', 'both'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setOutputType(type)}
                                className={`
                                    px-4 py-2 rounded-lg text-sm font-medium transition-all
                                    ${config.outputType === type
                                        ? 'bg-[var(--color-accent)] text-white'
                                        : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]'
                                    }
                                `}
                            >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                        ))}
                    </div>
                    {config.outputTypeReasoning && (
                        <p className="text-xs text-[var(--color-text-muted)] mt-2">{config.outputTypeReasoning}</p>
                    )}
                </div>
                ) : null}

                {activeConfigSection === 'criteria' ? (
                <div className="mb-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                            Criteria ({config.criteria.length})
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={regenerateCriteria}
                            disabled={isGenerating}
                        >
                            <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
                            Auto
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {config.criteria.map((criterion, index) => (
                            <div
                                key={criterion.id}
                                className="border border-[var(--color-border)] rounded-lg overflow-hidden"
                            >
                                <div
                                    className="flex items-center justify-between p-3 bg-[var(--color-bg-tertiary)] cursor-pointer"
                                    onClick={() => setExpandedCriterion(expandedCriterion === index ? null : index)}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                                            {criterion.name}
                                        </span>
                                        <span className="text-xs text-[var(--color-text-muted)]">(1-5)</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                removeCriterion(index)
                                            }}
                                            className="p-1 hover:bg-[var(--color-bg-elevated)] rounded"
                                        >
                                            <Trash2 size={14} className="text-[var(--color-text-muted)]" />
                                        </button>
                                        {expandedCriterion === index ? (
                                            <ChevronUp size={16} className="text-[var(--color-text-muted)]" />
                                        ) : (
                                            <ChevronDown size={16} className="text-[var(--color-text-muted)]" />
                                        )}
                                    </div>
                                </div>
                                {expandedCriterion === index && (
                                    <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-bg-primary)]">
                                        <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                                            {criterion.description}
                                        </p>
                                        {criterion.rubric && (
                                            <div className="text-xs text-[var(--color-text-muted)] space-y-1">
                                                {Object.entries(criterion.rubric).sort((a, b) => b[0] - a[0]).map(([score, desc]) => (
                                                    <div key={score} className="flex gap-2">
                                                        <span className="font-medium w-4">{score}:</span>
                                                        <span>{desc}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        <button
                            onClick={() => addCriterion()}
                            className="w-full p-3 border border-dashed border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-secondary)] transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus size={14} />
                            Add Criterion
                        </button>
                    </div>
                </div>
                ) : null}

                {activeConfigSection === 'prompts' ? (
                <div className="mb-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                                Prompts ({config.prompts.length})
                            </h3>
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-[var(--color-text-muted)]">Count:</label>
                                <select
                                    value={config.promptCount}
                                    onChange={(e) => setPromptCount(Number(e.target.value))}
                                    className="text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded px-2 py-1"
                                >
                                    {[3, 5, 10, 25, 50, 100].map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={regeneratePrompts}
                            disabled={isGenerating}
                        >
                            <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
                            Auto
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {displayPrompts.map((prompt, index) => (
                            <div
                                key={index}
                                className="group flex items-start gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3"
                            >
                                <span className="text-xs text-[var(--color-text-muted)] mt-0.5 w-6 flex-shrink-0">
                                    {index + 1}.
                                </span>
                                {editingPrompt === index ? (
                                    <input
                                        type="text"
                                        value={prompt}
                                        onChange={(e) => updatePrompt(index, e.target.value)}
                                        onBlur={() => setEditingPrompt(null)}
                                        onKeyDown={(e) => e.key === 'Enter' && setEditingPrompt(null)}
                                        autoFocus
                                        className="flex-1 text-sm bg-transparent border-none outline-none"
                                    />
                                ) : (
                                    <span className="flex-1 text-sm text-[var(--color-text-secondary)]">
                                        {prompt}
                                    </span>
                                )}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => setEditingPrompt(index)}
                                        className="p-1 hover:bg-[var(--color-bg-elevated)] rounded"
                                    >
                                        <Edit3 size={12} className="text-[var(--color-text-muted)]" />
                                    </button>
                                    <button
                                        onClick={() => removePrompt(index)}
                                        className="p-1 hover:bg-[var(--color-bg-elevated)] rounded"
                                    >
                                        <Trash2 size={12} className="text-[var(--color-text-muted)]" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {config.prompts.length > 5 && (
                            <button
                                onClick={() => setShowAllPrompts(!showAllPrompts)}
                                className="w-full p-2 text-sm text-[var(--color-accent)] hover:underline"
                            >
                                {showAllPrompts ? 'Show fewer prompts' : `View all ${config.prompts.length} prompts`}
                            </button>
                        )}

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newPromptText}
                                onChange={(e) => setNewPromptText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newPromptText.trim()) {
                                        addPrompt(newPromptText.trim())
                                        setNewPromptText('')
                                    }
                                }}
                                placeholder="Add a prompt..."
                                className="flex-1 text-sm"
                            />
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                    if (newPromptText.trim()) {
                                        addPrompt(newPromptText.trim())
                                        setNewPromptText('')
                                    }
                                }}
                                disabled={!newPromptText.trim()}
                            >
                                <Plus size={14} />
                                Add
                            </Button>
                        </div>
                    </div>
                </div>
                ) : null}

                {activeConfigSection === 'ready' ? (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Ready to Evaluate</h3>
                            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                Review your configuration, then continue to the evaluation workspace.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {providerConnectionStepComplete ? <Badge variant="success">Provider Managed</Badge> : null}
                            {skillsComplete ? <Badge variant="success">Skills Ready</Badge> : null}
                            {configComplete ? <Badge variant="success">Config Ready</Badge> : null}
                        </div>
                    </div>
                </div>
                ) : null}

                <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-5">
                    <Button
                        variant="ghost"
                        onClick={() => previousConfigSection && switchConfigSection(previousConfigSection.id)}
                        disabled={!previousConfigSection}
                    >
                        Previous
                    </Button>
                    <div className="text-xs text-[var(--color-text-muted)]">
                        {activeConfigSectionIndex + 1} of {configSections.length}
                    </div>
                    <Button
                        variant="secondary"
                        onClick={() => nextConfigSection && switchConfigSection(nextConfigSection.id)}
                        disabled={!nextConfigSection}
                    >
                        Next
                    </Button>
                </div>
                </Card>
            ) : null}

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-[var(--color-border)]">
                <Link to={isV2 ? '/v2/evaluate' : '/'}>
                    <Button variant="ghost">Cancel</Button>
                </Link>
                <Button
                    onClick={() => navigate(isV2 ? '/v2/evaluate' : '/evaluate')}
                    disabled={!isReadyToEvaluate}
                >
                    Continue to Evaluate
                    <ArrowRight size={16} strokeWidth={2} />
                </Button>
            </div>

            {showNewRunConfirm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="start-new-run-title"
                >
                    <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2
                                    id="start-new-run-title"
                                    className="text-lg font-semibold text-[var(--color-text-primary)]"
                                >
                                    Start a new run?
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                                    This clears the current configuration and active evaluation results. Saved run history is not deleted.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowNewRunConfirm(false)}
                                className="rounded-lg p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
                                aria-label="Close confirmation"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setShowNewRunConfirm(false)}>
                                Cancel
                            </Button>
                            <Button onClick={resetCurrentRun}>
                                Start New Run
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ConfigureView
