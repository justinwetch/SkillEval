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
import { useSettings } from '../contexts/SettingsContext'
import { useEvalConfig } from '../contexts/EvalConfigContext'

function ConfigureView() {
    const navigate = useNavigate()
    const { settings, setApiKey, needsApiKey } = useSettings()
    const {
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
        isReadyToEvaluate,
        hasSkills
    } = useEvalConfig()

    const [localApiKey, setLocalApiKey] = useState(settings.apiKey || '')
    const [expandedCriterion, setExpandedCriterion] = useState(null)
    const [editingPrompt, setEditingPrompt] = useState(null)
    const [newPromptText, setNewPromptText] = useState('')
    const [showAllPrompts, setShowAllPrompts] = useState(false)

    const fileInputARef = useRef(null)
    const fileInputBRef = useRef(null)

    // Handle API key save
    const handleSaveApiKey = () => {
        setApiKey(localApiKey)
    }

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
    const apiKeyComplete = !needsApiKey
    const skillsComplete = hasSkills
    const configComplete = config.criteria.length > 0 && config.prompts.length > 0

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

            {/* Step 1: API Key */}
            <Card padding="none" className="p-6 mb-4">
                <div className="flex items-start gap-4">
                    <div className={`
                        w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0
                        ${apiKeyComplete
                            ? 'bg-[var(--color-success)] text-[#FFFFFF]'
                            : 'bg-[var(--color-accent)] text-[#FFFFFF]'
                        }
                    `}>
                        {apiKeyComplete ? <Check size={16} strokeWidth={2.5} /> : '1'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                                API Key
                            </h2>
                            {apiKeyComplete && <Badge variant="success">Configured</Badge>}
                        </div>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                            Required to run evaluations — stored locally in your browser
                        </p>

                        {!apiKeyComplete ? (
                            <div className="flex gap-3">
                                <input
                                    type="password"
                                    value={localApiKey}
                                    onChange={(e) => setLocalApiKey(e.target.value)}
                                    placeholder="sk-ant-api03-..."
                                    className="flex-1 font-mono text-sm"
                                />
                                <Button
                                    onClick={handleSaveApiKey}
                                    disabled={!localApiKey.trim()}
                                    size="md"
                                >
                                    Save Key
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-[var(--color-text-muted)] font-mono">
                                    ••••••••{settings.apiKey.slice(-8)}
                                </span>
                                <Link to="/settings" className="text-sm text-[var(--color-accent)] hover:underline">
                                    Change in Settings
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Step 2: Upload Skills */}
            <Card padding="none" className={`p-6 mb-4 ${!apiKeyComplete ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-start gap-4 mb-6">
                    <div className={`
                        w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0
                        ${skillsComplete
                            ? 'bg-[var(--color-success)] text-[#FFFFFF]'
                            : apiKeyComplete
                                ? 'bg-[var(--color-accent)] text-[#FFFFFF]'
                                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
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
                        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
                            Configure Evaluation
                        </h2>
                        <p className="text-sm text-[var(--color-text-secondary)]">
                            Generate or customize criteria and prompts
                        </p>
                    </div>
                </div>

                {/* Generate All Button */}
                <div className="mb-6">
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
