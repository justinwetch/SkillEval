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
    ChevronUp,
    Key
} from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import { useSettings } from '../contexts/SettingsContext'
import { useEvalConfig } from '../contexts/EvalConfigContext'
import { getModel, getModelProvider, getModelsByProvider, PROVIDERS } from '../utils/providers'

function ConfigureView() {
    const navigate = useNavigate()
    const { settings, updateSetting, hasApiKeyForModel } = useSettings()
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
        isReadyToEvaluate,
        hasSkills
    } = useEvalConfig()

    const [expandedCriterion, setExpandedCriterion] = useState(null)
    const [editingPrompt, setEditingPrompt] = useState(null)
    const [newPromptText, setNewPromptText] = useState('')
    const [showAllPrompts, setShowAllPrompts] = useState(false)
    const modelGroups = getModelsByProvider()

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
    const modelAccessComplete = [
        settings.defaultGenModel,
        settings.defaultJudgeModel,
    ].every(model => hasApiKeyForModel(model))
    const judgeModelAccessComplete = hasApiKeyForModel(settings.defaultJudgeModel)
    const skillsComplete = hasSkills
    const configComplete = config.criteria.length > 0 && config.prompts.length > 0
    const judgeProviderId = getModelProvider(settings.defaultJudgeModel)
    const judgeProvider = PROVIDERS[judgeProviderId]
    const judgeModel = getModel(settings.defaultJudgeModel)

    const renderModelOptions = () => modelGroups.map(({ provider, models }) => (
        <optgroup key={provider.id} label={provider.label}>
            {models.map(model => (
                <option key={model.value} value={model.value}>{model.label}</option>
            ))}
        </optgroup>
    ))

    const renderModelAccess = (model) => {
        const providerId = getModelProvider(model)
        const provider = PROVIDERS[providerId]
        const hasKey = hasApiKeyForModel(model)

        if (hasKey) {
            return <Badge variant="success">{provider.label} connected</Badge>
        }

        return (
            <div className="flex items-center gap-2">
                <Badge variant="warning">{provider.label} key needed</Badge>
                <Link
                    to={`/settings?provider=${providerId}&returnTo=${encodeURIComponent('/configure')}`}
                    className="inline-flex items-center gap-1.5 text-sm text-[var(--color-accent)] hover:underline"
                >
                    <Key size={14} strokeWidth={2} />
                    Add {provider.label} Key
                </Link>
            </div>
        )
    }

    const openProviderSettings = (providerId) => {
        navigate(`/settings?provider=${providerId}&returnTo=${encodeURIComponent('/configure')}`)
    }

    // Prompts to display (limited unless expanded)
    const displayPrompts = showAllPrompts ? config.prompts : config.prompts.slice(0, 5)

    return (
        <div className="animate-fade-in max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-2">
                    Configure Evaluation
                </h1>
                <p className="text-[var(--color-text-secondary)]">
                    Upload skills, then generate or customize your evaluation criteria
                </p>
            </div>

            {/* Step 1: Model Access */}
            <Card padding="none" className="p-6 mb-4">
                <div className="flex items-start gap-4">
                    <div className={`
                        w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center text-sm font-semibold flex-shrink-0
                        ${modelAccessComplete
                            ? 'bg-[var(--color-success)] text-[#FFFFFF]'
                            : 'bg-[var(--color-accent)] text-[var(--color-on-accent)]'
                        }
                    `}>
                        {modelAccessComplete ? <Check size={16} strokeWidth={2.5} /> : '1'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                                Select Models
                            </h2>
                            {modelAccessComplete && <Badge variant="success">Access ready</Badge>}
                        </div>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                            Choose the model that produces skill outputs and the model that creates prompts, criteria, and judgments
                        </p>

                        <div className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-[190px_1fr_auto] md:items-center">
                                <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                                    Output Model
                                </label>
                                <select
                                    value={settings.defaultGenModel}
                                    onChange={(e) => updateSetting('defaultGenModel', e.target.value)}
                                    className="w-full"
                                >
                                    {renderModelOptions()}
                                </select>
                                {renderModelAccess(settings.defaultGenModel)}
                            </div>

                            <div className="grid gap-3 md:grid-cols-[190px_1fr_auto] md:items-center">
                                <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                                    Judge Model
                                </label>
                                <select
                                    value={settings.defaultJudgeModel}
                                    onChange={(e) => updateSetting('defaultJudgeModel', e.target.value)}
                                    className="w-full"
                                >
                                    {renderModelOptions()}
                                </select>
                                {renderModelAccess(settings.defaultJudgeModel)}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Step 2: Upload Skills */}
            <Card padding="none" className="p-6 mb-4">
                <div className="flex items-start gap-4 mb-6">
                    <div className={`
                        w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center text-sm font-semibold flex-shrink-0
                        ${skillsComplete
                            ? 'bg-[var(--color-success)] text-[#FFFFFF]'
                            : 'bg-[var(--color-accent)] text-[var(--color-on-accent)]'
                        }
                    `}>
                        {skillsComplete ? <Check size={16} strokeWidth={2.5} /> : '2'}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                                Upload Skills
                            </h2>
                            {skillsComplete && <Badge variant="success">Ready</Badge>}
                        </div>
                        <p className="text-sm text-[var(--color-text-secondary)]">
                            Upload two skill.md files to compare
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
                                        <div className="flex items-center gap-2 min-w-0">
                                            <FileText size={18} className="text-[var(--color-success)] flex-shrink-0" />
                                            <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                                                {skill.filename}
                                            </span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setSkill(side, { filename: '', content: '' })
                                            }}
                                            className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded"
                                        >
                                            <X size={16} className="text-[var(--color-text-muted)]" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={20} className="text-[var(--color-text-muted)] mx-auto mb-2" strokeWidth={1.5} />
                                        <div className="text-sm font-medium text-[var(--color-text-primary)] mb-0.5">
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

            {/* Step 3: Configure Evaluation */}
            <Card padding="none" className={`p-6 mb-4 ${!skillsComplete ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-4 mb-6">
                    <div className={`
                        w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center text-sm font-semibold flex-shrink-0
                        ${configComplete
                            ? 'bg-[var(--color-success)] text-[#FFFFFF]'
                            : skillsComplete
                                ? 'bg-[var(--color-accent)] text-[var(--color-on-accent)]'
                                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
                        }
                    `}>
                        {configComplete ? <Check size={16} strokeWidth={2.5} /> : '3'}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
                            Configure Evaluation
                        </h2>
                        <p className="text-sm text-[var(--color-text-secondary)]">
                            Generate or customize criteria and prompts with the Judge model
                        </p>
                    </div>
                </div>

                {/* Generate All Button */}
                <div className="mb-6">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-sm text-[var(--color-text-secondary)]">
                            Config generation uses <span className="font-medium text-[var(--color-text-primary)]">{judgeModel?.label || settings.defaultJudgeModel}</span>
                        </p>
                        {judgeModelAccessComplete ? (
                            <Badge variant="success">{judgeProvider.label} connected</Badge>
                        ) : (
                            <Badge variant="warning">{judgeProvider.label} key needed</Badge>
                        )}
                    </div>
                    {judgeModelAccessComplete ? (
                        <Button
                            onClick={() => generateAll(false)}
                            disabled={isGenerating || !skillsComplete}
                            className="w-full"
                            size="lg"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Wand2 size={18} />
                                    Generate All from Skills
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button
                            onClick={() => openProviderSettings(judgeProviderId)}
                            className="w-full"
                            size="lg"
                        >
                            <Key size={18} />
                            Add {judgeProvider.label} Key to Generate
                        </Button>
                    )}
                    {generationError && (
                        <p className="text-sm text-[var(--color-error)] mt-2">{generationError}</p>
                    )}
                </div>

                {/* Output Type */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
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
                                        ? 'bg-[var(--color-accent)] text-[var(--color-on-accent)]'
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

                {/* Criteria */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                            Criteria ({config.criteria.length})
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={regenerateCriteria}
                            disabled={isGenerating || !judgeModelAccessComplete}
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

                {/* Prompts */}
                <div>
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
                                    {[10, 25, 50, 100].map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={regeneratePrompts}
                            disabled={isGenerating || !judgeModelAccessComplete}
                        >
                            <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
                            Auto
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {displayPrompts.map((prompt, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-2 p-3 bg-[var(--color-bg-tertiary)] rounded-lg group"
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
                                {showAllPrompts ? 'Show less' : `Show all ${config.prompts.length} prompts`}
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
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-[var(--color-border)]">
                <Link to="/">
                    <Button variant="ghost">Cancel</Button>
                </Link>
                <Button
                    onClick={() => navigate('/evaluate')}
                    disabled={!isReadyToEvaluate}
                >
                    Continue to Evaluate
                    <ArrowRight size={16} strokeWidth={2} />
                </Button>
            </div>
        </div>
    )
}

export default ConfigureView
