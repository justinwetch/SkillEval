import { useEffect, useState } from 'react'
import { CheckCircle2, Cpu, RefreshCw, Trash2, WifiOff } from 'lucide-react'
import '@llm-hub/ui/styles.css'
import { ConnectionSchemaRenderer, ProviderStatusBadge, WarningCallout } from '@llm-hub/ui'
import { useSettings } from '../contexts/SettingsContext'
import { useLlmHub } from '../contexts/LlmHubContext'
import Badge from '../components/Badge'
import Card from '../components/Card'
import Button from '../components/Button'

function formatModelLabel(model) {
    return `${model.displayName || model.modelId} (${model.providerId})`
}

function SettingsView() {
    const { settings, updateSetting } = useSettings()
    const { adapter, providers, connectedProviders, models, isLoading, error, refresh } = useLlmHub()
    const [activeSettingsSection, setActiveSettingsSection] = useState('connections')
    const [selectedProviderId, setSelectedProviderId] = useState('')
    const [authMethods, setAuthMethods] = useState([])
    const [selectedAuthMethodId, setSelectedAuthMethodId] = useState('')
    const [connectionFeedback, setConnectionFeedback] = useState(null)
    const [defaultsDraft, setDefaultsDraft] = useState({
        defaultConfigGenModel: settings.defaultConfigGenModel,
        defaultEvalModel: settings.defaultEvalModel,
        defaultJudgeModel: settings.defaultJudgeModel,
    })
    const [defaultsSaved, setDefaultsSaved] = useState(false)
    const effectiveSelectedProviderId = selectedProviderId || providers[0]?.id || ''
    const selectedProvider = providers.find((provider) => provider.id === effectiveSelectedProviderId)
    const selectedAuthMethod = authMethods.find((method) => method.id === selectedAuthMethodId)
    const connectedProvider = connectedProviders.find(
        (provider) => provider.id === effectiveSelectedProviderId,
    )
    const selectedProviderConnected = Boolean(connectedProvider || selectedProvider?.connected)
    const selectedProviderModels = models.filter(
        (model) => model.connected && model.providerId === effectiveSelectedProviderId && model.kind === 'language',
    )
    const connectedLanguageModels = models.filter(
        (model) => model.connected && model.kind === 'language',
    )
    const settingsSections = [
        {
            id: 'connections',
            title: 'Connections',
            description: connectedProviders.length === 0 ? 'No active providers' : `${connectedProviders.length} active provider${connectedProviders.length === 1 ? '' : 's'}`,
        },
        {
            id: 'defaults',
            title: 'Defaults',
            description: connectedLanguageModels.length === 0 ? 'No connected models yet' : `${connectedLanguageModels.length} connected model${connectedLanguageModels.length === 1 ? '' : 's'}`,
        },
        {
            id: 'data',
            title: 'Data',
            description: 'Reset saved settings and runs',
        },
    ]

    const handleClearData = () => {
        if (window.confirm('Are you sure you want to clear all saved data? This cannot be undone.')) {
            localStorage.clear()
            window.location.reload()
        }
    }

    const handleDisconnectProvider = async (provider) => {
        if (!window.confirm(`Disconnect ${provider.name}? Stored credentials for this provider will be removed.`)) {
            return
        }

        try {
            await adapter.disconnect(provider.id)
            setConnectionFeedback({ tone: 'success', text: `${provider.name} disconnected.` })
            await refresh()
        } catch (disconnectError) {
            setConnectionFeedback({ tone: 'danger', text: disconnectError.message })
        }
    }

    const handleSaveDefaults = () => {
        updateSetting('defaultConfigGenModel', defaultsDraft.defaultConfigGenModel)
        updateSetting('defaultEvalModel', defaultsDraft.defaultEvalModel)
        updateSetting('defaultJudgeModel', defaultsDraft.defaultJudgeModel)
        setDefaultsSaved(true)
    }

    useEffect(() => {
        let cancelled = false

        async function loadAuthMethods() {
            if (!effectiveSelectedProviderId) {
                setAuthMethods([])
                setSelectedAuthMethodId('')
                return
            }

            const response = await adapter.getAuthMethods(effectiveSelectedProviderId)

            if (cancelled) {
                return
            }

            setAuthMethods(response.authMethods)
            setSelectedAuthMethodId((current) =>
                response.authMethods.some((method) => method.id === current)
                    ? current
                    : response.authMethods[0]?.id || '',
            )
        }

        void loadAuthMethods()

        return () => {
            cancelled = true
        }
    }, [adapter, effectiveSelectedProviderId])

    const renderModelSelect = (label, settingKey, helperText) => (
        <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2.5">
                {label}
            </label>
            <select
                value={defaultsDraft[settingKey] ? JSON.stringify(defaultsDraft[settingKey]) : ''}
                onChange={(event) => {
                    setDefaultsSaved(false)
                    setDefaultsDraft((current) => ({
                        ...current,
                        [settingKey]: event.target.value ? JSON.parse(event.target.value) : null,
                    }))
                }}
                className="w-full"
                disabled={connectedLanguageModels.length === 0}
            >
                <option value="">Select a connected model</option>
                {connectedLanguageModels.map((model) => {
                    const value = JSON.stringify({
                        providerId: model.providerId,
                        modelId: model.modelId,
                    })

                    return (
                        <option key={model.fullModelId} value={value}>
                            {formatModelLabel(model)}
                        </option>
                    )
                })}
            </select>
            <p className="text-xs text-[var(--color-text-muted)] mt-2.5">
                {helperText}
            </p>
        </div>
    )

    return (
        <div className="animate-fade-in max-w-2xl mx-auto">
            <div className="mb-10">
                <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-3">
                    Settings
                </h1>
                <p className="text-[var(--color-text-secondary)] text-lg leading-relaxed">
                    Connect providers through the local llm-hub sidecar and choose stage defaults.
                </p>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2">
                {settingsSections.map((section) => (
                    <button
                        key={section.id}
                        type="button"
                        onClick={() => setActiveSettingsSection(section.id)}
                        className={`rounded-xl px-4 py-3 text-left transition-colors ${activeSettingsSection === section.id
                            ? 'bg-[var(--color-bg-primary)] shadow-sm'
                            : 'hover:bg-[var(--color-bg-tertiary)]'
                            }`}
                    >
                        <div className="text-sm font-semibold text-[var(--color-text-primary)]">{section.title}</div>
                        <div className="mt-1 truncate text-xs text-[var(--color-text-muted)]">{section.description}</div>
                    </button>
                ))}
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge variant="success">{connectedProviders.length} Provider{connectedProviders.length === 1 ? '' : 's'} Connected</Badge>
                <Badge variant="success">{connectedLanguageModels.length} Model{connectedLanguageModels.length === 1 ? '' : 's'} Available</Badge>
            </div>

            {activeSettingsSection === 'connections' ? (
            <Card padding="none" className="p-8 mb-6">
                <div className="flex items-start gap-5 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent-subtle)] flex items-center justify-center text-[var(--color-accent)] flex-shrink-0">
                        <Cpu size={22} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
                            Provider Connections
                        </h2>
                        <p className="text-sm text-[var(--color-text-muted)]">
                            Secrets are stored by llm-hub, not in browser localStorage.
                        </p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={refresh} disabled={isLoading}>
                        <RefreshCw size={14} strokeWidth={2} />
                        Refresh
                    </Button>
                </div>

                {error ? (
                    <div className="rounded-xl border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 p-4 text-sm text-[var(--color-text-secondary)]">
                        <div className="flex items-center gap-2 font-medium text-[var(--color-text-primary)] mb-1">
                            <WifiOff size={16} strokeWidth={2} />
                            llm-hub sidecar unavailable
                        </div>
                        Start it with <code>npm --prefix app run llm-hub</code>, then refresh this page.
                    </div>
                ) : (
                    <div className="space-y-5">
                        <p className="text-sm text-[var(--color-text-secondary)]">
                            {connectedProviders.length === 0
                                ? 'No connected providers yet. Connect Gemini with an API key or Codex through OAuth.'
                                : `${connectedProviders.length} provider connection${connectedProviders.length === 1 ? '' : 's'} available.`}
                        </p>

                        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                                    Connected providers
                                </h3>
                                <span className="text-xs text-[var(--color-text-muted)]">
                                    {connectedProviders.length} active
                                </span>
                            </div>
                            {connectedProviders.length === 0 ? (
                                <p className="text-sm text-[var(--color-text-muted)]">
                                    No providers are connected yet.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {connectedProviders.map((provider) => {
                                        const providerModels = models.filter(
                                            (model) => model.connected && model.providerId === provider.id && model.kind === 'language',
                                        )

                                        return (
                                            <div
                                                key={provider.id}
                                                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2"
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                                                            {provider.name}
                                                        </span>
                                                        <ProviderStatusBadge
                                                            connected
                                                            experimental={provider.experimental}
                                                        />
                                                    </div>
                                                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                                        {providerModels.length} connected model{providerModels.length === 1 ? '' : 's'}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDisconnectProvider(provider)}
                                                >
                                                    Disconnect
                                                </Button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block">
                                <span className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                                    Provider
                                </span>
                                <select
                                    value={effectiveSelectedProviderId}
                                    onChange={(event) => {
                                        setConnectionFeedback(null)
                                        setSelectedProviderId(event.target.value)
                                    }}
                                    className="w-full"
                                >
                                    {providers.map((provider) => (
                                        <option key={provider.id} value={provider.id}>
                                            {provider.name}{provider.connected ? ' (connected)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block">
                                <span className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                                    Auth Method
                                </span>
                                <select
                                    value={selectedAuthMethodId}
                                    onChange={(event) => {
                                        setConnectionFeedback(null)
                                        setSelectedAuthMethodId(event.target.value)
                                    }}
                                    className="w-full"
                                    disabled={authMethods.length === 0}
                                >
                                    {authMethods.map((method) => (
                                        <option key={method.id} value={method.id}>
                                            {method.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        {selectedProvider ? (
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]/55 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                                            {selectedProvider.name}
                                        </p>
                                        <p className="text-xs text-[var(--color-text-muted)]">
                                            {selectedProviderConnected
                                                ? `${selectedProviderModels.length} connected model${selectedProviderModels.length === 1 ? '' : 's'} available.`
                                                : 'Not connected yet. Save the API key, then use Test connection to verify it.'}
                                        </p>
                                    </div>
                                    <ProviderStatusBadge
                                        connected={selectedProviderConnected}
                                        experimental={selectedProvider.experimental}
                                    />
                                </div>

                                {connectionFeedback ? (
                                    <WarningCallout
                                        title={connectionFeedback.tone === 'success' ? 'Connection updated' : 'Connection issue'}
                                        tone={connectionFeedback.tone === 'success' ? 'success' : 'danger'}
                                        className="skill-eval-llm-hub-feedback"
                                    >
                                        {connectionFeedback.text}
                                    </WarningCallout>
                                ) : null}
                            </div>
                        ) : null}

                        {selectedProvider && selectedAuthMethod ? (
                            <ConnectionSchemaRenderer
                                adapter={adapter}
                                provider={selectedProvider}
                                authMethod={selectedAuthMethod}
                                hostMode="full_settings_page"
                                className="skill-eval-llm-hub"
                                feedbackMode="external"
                                onFeedback={setConnectionFeedback}
                                onMutation={async () => refresh()}
                                density="comfortable"
                            />
                        ) : null}
                    </div>
                )}
            </Card>
            ) : null}

            {activeSettingsSection === 'defaults' ? (
            <Card padding="none" className="p-8 mb-6">
                <div className="flex items-start gap-5 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent-subtle)] flex items-center justify-center text-[var(--color-accent)] flex-shrink-0">
                        <Cpu size={22} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
                            Stage Default Models
                        </h2>
                        <p className="text-sm text-[var(--color-text-muted)]">
                            Choose connected language models for each SkillEval stage.
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    {renderModelSelect(
                        'Configuration Generation',
                        'defaultConfigGenModel',
                        'Used to generate criteria, prompts, and output type.',
                    )}
                    {renderModelSelect(
                        'Evaluation Generation',
                        'defaultEvalModel',
                        'Used to run each skill against each prompt.',
                    )}
                    {renderModelSelect(
                        'Judging',
                        'defaultJudgeModel',
                        'Used to compare outputs and produce scores.',
                    )}
                    <div className="flex items-center justify-between gap-3 pt-2">
                        <p className="text-xs text-[var(--color-text-muted)]">
                            Defaults are applied to new stage selectors after saving.
                        </p>
                        <div className="flex items-center gap-3">
                            {defaultsSaved && (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                    <CheckCircle2 size={13} />
                                    Saved
                                </span>
                            )}
                            <Button
                                onClick={handleSaveDefaults}
                                disabled={connectedLanguageModels.length === 0}
                            >
                                Save Defaults
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
            ) : null}

            {activeSettingsSection === 'data' ? (
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
                            Clear all saved settings and evaluation data.
                        </p>
                    </div>
                </div>

                <Button variant="danger" size="sm" onClick={handleClearData}>
                    <Trash2 size={14} strokeWidth={2} />
                    Clear All Data
                </Button>
            </Card>
            ) : null}
        </div>
    )
}

export default SettingsView
