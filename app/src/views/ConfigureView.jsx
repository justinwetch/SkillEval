import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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

function normalizeSkillContent(content = '') {
    return content.replace(/\r\n/g, '\n').trim()
}

function ConfigureView({ variant = 'classic' }) {
    const isV2 = variant === 'v2'
    const navigate = useNavigate()
    const {
        config,
        isGenerating,
        generationError,
        addSkill,
        removeSkill,
        setComparisonMode,
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
    const [skillUploadError, setSkillUploadError] = useState(null)

    const addSkillInputRef = useRef(null)

    // Handle file upload
    const handleFileUpload = useCallback(async (file) => {
        if (!file) return

        const content = await file.text()
        const normalizedContent = normalizeSkillContent(content)
        const duplicateSkill = config.skills.find(
            (skill) => normalizeSkillContent(skill.content) === normalizedContent,
        )

        if (duplicateSkill) {
            setSkillUploadError(`Duplicate skill content detected: "${file.name}" matches "${duplicateSkill.filename || 'existing skill'}".`)
            return
        }

        setSkillUploadError(null)
        addSkill({
            filename: file.name,
            content
        })
    }, [addSkill, config.skills])

    // Handle drag and drop
    const handleDrop = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()
        const file = e.dataTransfer?.files?.[0]
        if (file && (file.name.endsWith('.md') || file.type === 'text/markdown' || file.type === 'text/plain')) {
            handleFileUpload(file)
        }
    }, [handleFileUpload])

    const handleDragOver = (e) => {
        e.preventDefault()
        e.stopPropagation()
    }

    // Determine step completion
    const skillsComplete = hasSkills
    const configComplete = config.criteria.length > 0 && config.prompts.length > 0
    const resolvedActiveStep = activeSetupStep === 'config' && !skillsComplete ? 'skills' : activeSetupStep
    const isPairwiseMode = config.comparisonMode === 'pairwise'
    const maxSkillCount = isPairwiseMode ? 2 : 5

    // Prompts to display (limited unless expanded)
    const displayPrompts = showAllPrompts ? config.prompts : config.prompts.slice(0, 5)
    const promptCountOptions = [3, 5, 10, 25, 50, 100]

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

    const handleRemoveSkill = useCallback((index) => {
        setSkillUploadError(null)
        removeSkill(index)
    }, [removeSkill])

    const setupSteps = [
        {
            id: 'skills',
            title: 'Skills',
            description: skillsComplete
                ? `${config.skills.length} skills uploaded`
                : 'Upload at least two skills',
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
        { id: 'output', label: 'Configurations' },
        { id: 'criteria', label: 'Criteria' },
        { id: 'prompts', label: 'Prompts' },
        { id: 'ready', label: 'Ready' },
    ]
    const activeConfigSectionIndex = configSections.findIndex((section) => section.id === activeConfigSection)
    const previousConfigSection = activeConfigSectionIndex > 0 ? configSections[activeConfigSectionIndex - 1] : null
    const nextConfigSection = activeConfigSectionIndex >= 0 && activeConfigSectionIndex < configSections.length - 1
        ? configSections[activeConfigSectionIndex + 1]
        : null
    const isFinalConfigSection = activeConfigSection === configSections[configSections.length - 1]?.id
    const requiredPlaceholderCount = Math.max(0, 2 - config.skills.length)
    const showAddSkillTile = !isPairwiseMode && config.skills.length < maxSkillCount
    const isAddSkillTileDisabled = config.skills.length < 2
    const fullSkillTileWidth = 210
    const baselineDividerWidth = 16
    const optionalAddTileWidth = 52
    const skillTileGap = 16
    const shouldShowBaselineDivider = !isPairwiseMode && config.skills.length > 2
    const tileWidths = [
        ...config.skills.flatMap((_, index) =>
            shouldShowBaselineDivider && index === 0
                ? [fullSkillTileWidth, baselineDividerWidth]
                : [fullSkillTileWidth],
        ),
        ...Array(requiredPlaceholderCount).fill(fullSkillTileWidth),
        ...(showAddSkillTile ? [optionalAddTileWidth] : []),
    ]
    const skillTilesWidth = tileWidths.length > 0
        ? tileWidths.reduce((sum, width) => sum + width, 0) + ((tileWidths.length - 1) * skillTileGap)
        : 0
    const uploadHeaderMinWidth = isPairwiseMode ? 0 : 540
    const v2SkillsCardWidth = Math.max(uploadHeaderMinWidth, skillTilesWidth + 48)
    const v2SkillsContentWidth = Math.max(300, Math.min(skillTilesWidth, 520))
    const v2SkillsStepStyle = isV2 && resolvedActiveStep === 'skills'
        ? { width: `${v2SkillsCardWidth}px`, maxWidth: '100%' }
        : undefined
    const requiredPlaceholderTiles = Array.from({ length: requiredPlaceholderCount }, (_, placeholderIndex) => {
        const slotIndex = config.skills.length + placeholderIndex
        const isPrimarySlot = slotIndex === 0
        const isDisabled = config.skills.length === 0 && !isPrimarySlot
        const roleLabel = isPairwiseMode
            ? slotIndex === 0
                ? 'Skill A'
                : 'Skill B'
            : slotIndex === 0
                ? 'Baseline'
                : `Challenger ${slotIndex}`

        return {
            key: `placeholder-${slotIndex}`,
            slotLabel: roleLabel,
            title: isPairwiseMode
                ? slotIndex === 0
                    ? 'Upload Skill A'
                    : 'Upload Skill B'
                : slotIndex === 0
                    ? 'Upload baseline skill'
                    : 'Upload primary challenger',
            subtitle: isPairwiseMode
                ? slotIndex === 0
                    ? 'First required skill'
                    : isDisabled
                        ? 'Unlock after Skill A'
                        : 'Second required skill'
                : isPrimarySlot
                ? 'First required skill'
                : isDisabled
                    ? 'Unlock after baseline'
                    : 'Required second skill',
            disabled: isDisabled,
        }
    })
    const uploadDescription = isPairwiseMode
        ? 'Upload exactly two skill files. They will be evaluated as a neutral head-to-head comparison.'
        : 'Upload between 2 and 5 skill files. The first skill becomes the baseline, and each additional skill is compared against it during evaluation.'
    const skillCountBadgeLabel = isPairwiseMode ? 'Exactly 2 skills' : '2-5 skills'
    const uploadedSkillsSummary = config.skills.length >= 1
        ? isPairwiseMode
            ? config.skills.length >= 2
                ? `Skill A: ${config.skillA.filename || 'Skill 1'} • Skill B: ${config.skillB.filename || 'Skill 2'}`
                : `Skill A: ${config.skillA.filename || 'Skill 1'}`
            : config.skills.length >= 2
                ? `Baseline: ${config.skillA.filename || 'Skill 1'} • ${config.skills.length - 1} challenger${config.skills.length - 1 === 1 ? '' : 's'}`
                : `Baseline: ${config.skillA.filename || 'Skill 1'}`
        : null

    const switchConfigSection = (sectionId) => {
        setActiveConfigSection(sectionId)
    }

    return (
        <div className={`mx-auto ${isV2 ? 'max-w-[1320px]' : 'max-w-3xl animate-fade-in'}`}>
            {/* Header */}
            <div
                className={`flex items-start justify-between gap-4 ${isV2 && resolvedActiveStep === 'skills' ? 'mx-auto mb-6 block max-w-full' : 'mb-8'}`}
                style={v2SkillsStepStyle}
            >
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-2">
                        Configure Evaluation
                    </h1>
                    <p className="text-[var(--color-text-secondary)]">
                        Upload skills, then generate or customize your evaluation criteria
                    </p>
                </div>
                <Button
                    variant="ghost"
                    onClick={handleStartNewRun}
                    className="flex-shrink-0 self-start whitespace-nowrap"
                >
                    <Plus size={16} />
                    Start New Run
                </Button>
            </div>

            <div
                className={`mb-3 ${isV2 && resolvedActiveStep === 'skills' ? 'mx-auto block max-w-full' : ''}`}
                style={v2SkillsStepStyle}
            >
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2">
                    {setupSteps.map((step, index) => (
                        <button
                            key={step.id}
                            type="button"
                            onClick={() => !step.disabled && setActiveSetupStep(step.id)}
                            disabled={step.disabled}
                            className={`rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${resolvedActiveStep === step.id
                                ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)] shadow-sm'
                                : 'border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)]'
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

            <div
                className={`mb-3 flex flex-wrap items-center gap-2 ${isV2 && resolvedActiveStep === 'skills' ? 'mx-auto block max-w-full' : ''}`}
                style={v2SkillsStepStyle}
            >
                {skillsComplete ? <Badge variant="success">Skills Ready</Badge> : null}
                {configComplete ? <Badge variant="success">Config Ready</Badge> : null}
            </div>

            {resolvedActiveStep === 'skills' ? (
                <Card
                    padding="none"
                    className={`mb-3 p-6 ${isV2 ? 'mx-auto block w-fit max-w-full' : ''}`}
                    style={v2SkillsStepStyle}
                >
                        <div
                            className={`mb-6 items-start justify-between gap-4 ${isV2 ? 'flex w-full' : 'flex'}`}
                        >
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)] text-sm font-semibold text-[#FFFFFF]">
                                1
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-4">
                                    <h2 className="whitespace-nowrap text-lg font-semibold text-[var(--color-text-primary)]">
                                        Upload Skills
                                    </h2>
                                    <div className="-mt-0.5 ml-auto inline-flex flex-shrink-0 items-center justify-end self-start">
                                        <div className="inline-flex rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-0.5">
                                            {[
                                                ['pairwise', 'Skill A vs Skill B'],
                                                ['baseline', 'Baseline vs Challenger'],
                                            ].map(([modeId, label]) => (
                                                <button
                                                    key={modeId}
                                                    type="button"
                                                    onClick={() => setComparisonMode(modeId)}
                                                    className={`rounded-sm px-1.5 py-0.5 text-[10px] leading-4 font-medium transition-colors ${config.comparisonMode === modeId ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-1.5 max-w-[420px] text-sm text-[var(--color-text-secondary)]">
                                    {uploadDescription}
                                </p>
                            </div>
                        </div>

                        <input
                            ref={addSkillInputRef}
                            type="file"
                            accept=".md,.txt"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e.target.files?.[0])}
                        />

                        <div
                            className="mb-4 flex flex-wrap items-center gap-2"
                            style={isV2 ? { maxWidth: `${v2SkillsContentWidth}px` } : undefined}
                        >
                            {config.skills.length > 0 ? (
                                <Badge variant="default">{`${config.skills.length} uploaded`}</Badge>
                            ) : null}
                            <Badge variant="default">{skillCountBadgeLabel}</Badge>
                                {uploadedSkillsSummary ? (
                                    <Badge variant="default" className={isV2 ? 'max-w-full truncate' : ''}>
                                        {uploadedSkillsSummary}
                                    </Badge>
                                ) : null}
                        </div>

                        {skillUploadError ? (
                            <p
                                className="mb-4 text-sm text-[var(--color-error)]"
                                style={isV2 ? { maxWidth: `${v2SkillsContentWidth}px` } : undefined}
                            >
                                {skillUploadError}
                            </p>
                        ) : null}

                        <div className="flex">
                            <div
                                className={isV2 ? 'grid' : 'inline-flex flex-wrap gap-4'}
                                style={isV2 ? {
                                    width: `${skillTilesWidth}px`,
                                    gridTemplateColumns: tileWidths.map((width) => `${width}px`).join(' '),
                                    gap: `${skillTileGap}px`,
                                } : undefined}
                            >
                                {config.skills.flatMap((skill, index) => {
                                    const item = (
                                        <div
                                            key={skill.id}
                                            className="min-h-[88px] w-[210px] flex-none rounded-lg border border-[var(--color-success)] bg-[var(--color-success)]/5 p-4"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <FileText size={18} className="text-[var(--color-success)] flex-shrink-0" />
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                                                            {skill.filename}
                                                        </div>
                                                        <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                                                            {isPairwiseMode
                                                                ? index === 0
                                                                    ? 'Skill A'
                                                                    : 'Skill B'
                                                                : index === 0
                                                                    ? 'Baseline skill'
                                                                    : `Challenger ${index}`}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveSkill(index)}
                                                    className="rounded p-1 hover:bg-[var(--color-bg-tertiary)]"
                                                    aria-label={`Remove ${skill.filename}`}
                                                >
                                                    <X size={16} className="text-[var(--color-text-muted)]" />
                                                </button>
                                            </div>
                                        </div>
                                    )

                                    if (shouldShowBaselineDivider && index === 0) {
                                        return [
                                            item,
                                            <div
                                                key="baseline-divider"
                                                className="flex min-h-[88px] w-[16px] flex-none items-center justify-center"
                                                aria-hidden="true"
                                            >
                                                <div className="h-16 w-px rounded-full bg-[var(--color-border)]" />
                                            </div>,
                                        ]
                                    }

                                    return [item]
                                })}

                                {requiredPlaceholderTiles.map((placeholder) => (
                                    <button
                                        key={placeholder.key}
                                        type="button"
                                        onClick={() => !placeholder.disabled && addSkillInputRef.current?.click()}
                                        onDrop={placeholder.disabled ? undefined : handleDrop}
                                        onDragOver={placeholder.disabled ? undefined : handleDragOver}
                                        disabled={placeholder.disabled}
                                        className={`min-h-[88px] w-[210px] flex-none rounded-lg border border-dashed px-3 py-4 text-left transition-all ${
                                            placeholder.disabled
                                                ? 'cursor-not-allowed border-[var(--color-border)] bg-[var(--color-bg-secondary)]/60 opacity-70'
                                                : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-elevated)]'
                                        }`}
                                    >
                                        <div className="flex h-full flex-col gap-3">
                                            <div className="inline-flex self-start rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                                                {placeholder.slotLabel}
                                            </div>
                                            <div className="flex min-h-0 flex-1 items-center gap-3">
                                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]">
                                                    <Plus size={18} strokeWidth={1.8} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium text-[var(--color-text-primary)]">
                                                        {placeholder.title}
                                                    </div>
                                                    <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                                                        {placeholder.subtitle}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}

                                {showAddSkillTile ? (
                                    <button
                                        type="button"
                                        onClick={() => !isAddSkillTileDisabled && addSkillInputRef.current?.click()}
                                        onDrop={isAddSkillTileDisabled ? undefined : handleDrop}
                                        onDragOver={isAddSkillTileDisabled ? undefined : handleDragOver}
                                        disabled={isAddSkillTileDisabled}
                                        className={`flex min-h-[88px] w-[52px] flex-none items-center justify-center rounded-lg border border-dashed transition-all ${
                                            isAddSkillTileDisabled
                                                ? 'cursor-not-allowed border-[var(--color-border)] bg-[var(--color-bg-secondary)]/60 opacity-70'
                                                : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-elevated)]'
                                        }`}
                                        aria-label={isPairwiseMode ? 'Add second skill' : 'Add challenger'}
                                    >
                                        <Plus size={20} className="text-[var(--color-text-muted)]" strokeWidth={1.8} />
                                    </button>
                                ) : null}
                            </div>
                        </div>
                        <div className="mt-5 flex items-center justify-end border-t border-[var(--color-border)] pt-5">
                            <Button
                                onClick={() => setActiveSetupStep('config')}
                                disabled={!skillsComplete}
                            >
                                Continue to Configure
                                <ArrowRight size={16} strokeWidth={2} />
                            </Button>
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
                        {configComplete ? <Check size={16} strokeWidth={2.5} /> : '2'}
                    </div>
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
                                    2. Configure Evaluation
                                </h2>
                                <p className="text-sm text-[var(--color-text-secondary)]">
                                    Choose your configurations, refine criteria, and preview prompts before running.
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
                                        Generate {config.promptCount} Prompt{config.promptCount === 1 ? '' : 's'} from Skills
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
                <div className="space-y-4 mb-6">
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-5">
                    <div className="mb-3">
                        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Evaluation Mode</h3>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                            Choose whether outputs should be judged from code only, rendered visuals, or both.
                        </p>
                    </div>
                    <div>
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
                    </div>
                    {config.outputTypeReasoning && (
                        <p className="text-xs text-[var(--color-text-muted)] mt-2">{config.outputTypeReasoning}</p>
                    )}
                </div>
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-5">
                    <div className="mb-4">
                        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">No. of Prompts</h3>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                            Pick how many prompts to generate for this evaluation run.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {promptCountOptions.map((count) => {
                            const isSelected = config.promptCount === count

                            return (
                                <button
                                    key={count}
                                    type="button"
                                    onClick={() => setPromptCount(count)}
                                    className={`min-w-[64px] rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                                        isSelected
                                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                                            : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
                                    }`}
                                >
                                    {count}
                                </button>
                            )
                        })}
                    </div>
                    <p className="mt-4 text-xs text-[var(--color-text-muted)]">
                        Selected: {config.promptCount} prompt{config.promptCount === 1 ? '' : 's'}
                    </p>
                </div>
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
                        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                            Prompts ({config.prompts.length})
                        </h3>
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
                        variant={isFinalConfigSection ? 'primary' : 'secondary'}
                        onClick={() => {
                            if (isFinalConfigSection) {
                                navigate(isV2 ? '/v2/evaluate' : '/evaluate')
                                return
                            }
                            if (nextConfigSection) {
                                switchConfigSection(nextConfigSection.id)
                            }
                        }}
                        disabled={isFinalConfigSection ? !isReadyToEvaluate : !nextConfigSection}
                    >
                        {isFinalConfigSection ? 'Start Evaluation' : 'Next'}
                    </Button>
                </div>
                </Card>
            ) : null}

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

