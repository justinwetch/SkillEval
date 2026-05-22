import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Cpu, Eye, EyeOff, Key, Trash2 } from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import { getModelsByProvider, PROVIDERS } from '../utils/providers'

function SettingsView() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const {
        settings,
        setApiKey,
        updateSetting,
    } = useSettings()

    const requestedProvider = searchParams.get('provider')
    const [showApiKeys, setShowApiKeys] = useState({})
    const [expandedProvider, setExpandedProvider] = useState(() => (
        PROVIDERS[requestedProvider] ? requestedProvider : null
    ))
    const [draftApiKeys, setDraftApiKeys] = useState(settings.apiKeys || {})
    const modelGroups = getModelsByProvider()
    const returnTo = searchParams.get('returnTo')

    const handleClearData = () => {
        if (window.confirm('Are you sure you want to clear all saved data? This cannot be undone.')) {
            localStorage.clear()
            window.location.reload()
        }
    }

    const handleSaveKey = (providerId) => {
        setApiKey(providerId, draftApiKeys[providerId] || '')
        if (returnTo) {
            navigate(returnTo)
        }
    }

    const handleRemoveKey = (providerId) => {
        setDraftApiKeys(prev => ({ ...prev, [providerId]: '' }))
        setApiKey(providerId, '')
    }

    const renderModelOptions = () => modelGroups.map(({ provider, models }) => (
        <optgroup key={provider.id} label={provider.label}>
            {models.map(model => (
                <option key={model.value} value={model.value}>{model.label}</option>
            ))}
        </optgroup>
    ))

    return (
        <div className="animate-fade-in max-w-2xl mx-auto">
            <div className="mb-10">
                <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-3">
                    Settings
                </h1>
                <p className="text-[var(--color-text-secondary)] text-lg leading-relaxed">
                    Manage provider keys and default model preferences
                </p>
            </div>

            <Card padding="none" className="p-8 mb-6">
                <div className="flex items-start gap-5 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent-subtle)] flex items-center justify-center text-[var(--color-accent)] flex-shrink-0">
                        <Key size={22} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
                            Provider Keys
                        </h2>
                        <p className="text-sm text-[var(--color-text-muted)]">
                            Add keys only for the providers you plan to use
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {Object.values(PROVIDERS).map(provider => {
                        const hasKey = !!settings.apiKeys?.[provider.id]
                        const isVisible = !!showApiKeys[provider.id]
                        const isExpanded = expandedProvider === provider.id

                        return (
                            <div
                                key={provider.id}
                                className="border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-tertiary)] overflow-hidden"
                            >
                                <button
                                    type="button"
                                    onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                                    className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-[var(--color-bg-elevated)] transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {hasKey ? (
                                            <CheckCircle2 size={18} className="text-[var(--color-success)] flex-shrink-0" />
                                        ) : (
                                            <AlertCircle size={18} className="text-[var(--color-warning)] flex-shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                                                {provider.label}
                                            </p>
                                            <p className="text-xs text-[var(--color-text-muted)]">
                                                {hasKey ? 'Key saved locally' : 'No key saved'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant={hasKey ? 'success' : 'warning'}>
                                            {hasKey ? 'Connected' : 'Not connected'}
                                        </Badge>
                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="border-t border-[var(--color-border)] p-4 bg-[var(--color-bg-secondary)]">
                                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2.5">
                                            {provider.keyLabel}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={isVisible ? 'text' : 'password'}
                                                value={draftApiKeys[provider.id] || ''}
                                                onChange={(e) => setDraftApiKeys(prev => ({ ...prev, [provider.id]: e.target.value }))}
                                                placeholder={provider.keyPlaceholder}
                                                className="w-full pr-12 font-mono text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowApiKeys(prev => ({ ...prev, [provider.id]: !isVisible }))}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors rounded-lg hover:bg-[var(--color-bg-elevated)]"
                                                aria-label={`${isVisible ? 'Hide' : 'Show'} ${provider.label} API key`}
                                            >
                                                {isVisible ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between gap-4 mt-3">
                                            <span className="text-sm text-[var(--color-text-muted)]">
                                                Get your key from{' '}
                                                <a
                                                    href={provider.keyUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[var(--color-accent)] hover:underline"
                                                >
                                                    {provider.keyHost}
                                                </a>
                                            </span>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {hasKey && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveKey(provider.id)}
                                                    >
                                                        Remove
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleSaveKey(provider.id)}
                                                    disabled={!draftApiKeys[provider.id]?.trim()}
                                                >
                                                    {returnTo ? 'Save and Return' : 'Save Key'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </Card>

            <Card padding="none" className="p-8 mb-6">
                <div className="flex items-start gap-5 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent-subtle)] flex items-center justify-center text-[var(--color-accent)] flex-shrink-0">
                        <Cpu size={22} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
                            Default Models
                        </h2>
                        <p className="text-sm text-[var(--color-text-muted)]">
                            Configure can override these as part of setup
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2.5">
                            Output Model
                        </label>
                        <select
                            value={settings.defaultGenModel}
                            onChange={(e) => updateSetting('defaultGenModel', e.target.value)}
                            className="w-full"
                        >
                            {renderModelOptions()}
                        </select>
                        <p className="text-xs text-[var(--color-text-muted)] mt-2.5">
                            Used to generate outputs from skills
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2.5">
                            Judge Model
                        </label>
                        <select
                            value={settings.defaultJudgeModel}
                            onChange={(e) => updateSetting('defaultJudgeModel', e.target.value)}
                            className="w-full"
                        >
                            {renderModelOptions()}
                        </select>
                        <p className="text-xs text-[var(--color-text-muted)] mt-2.5">
                            Used to generate criteria, prompts, and judgments
                        </p>
                    </div>
                </div>
            </Card>

            <Card padding="none" className="p-8 border-[var(--color-error)]/20">
                <div className="flex items-start gap-5 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[rgba(196,92,62,0.12)] flex items-center justify-center text-[var(--color-error)] flex-shrink-0">
                        <Trash2 size={22} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
                            Data Management
                        </h2>
                        <p className="text-sm text-[var(--color-text-muted)]">
                            Clear all saved settings and evaluation data
                        </p>
                    </div>
                </div>

                <Button
                    variant="danger"
                    size="sm"
                    onClick={handleClearData}
                >
                    <Trash2 size={14} strokeWidth={2} />
                    Clear All Data
                </Button>
            </Card>
        </div>
    )
}

export default SettingsView
