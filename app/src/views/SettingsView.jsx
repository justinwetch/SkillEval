import { useEffect, useState } from 'react'
import { Cpu, RefreshCw, Trash2, WifiOff } from 'lucide-react'
import '@llm-hub/ui/styles.css'
import { ConnectionSchemaRenderer } from '@llm-hub/ui'
import { useSettings } from '../contexts/SettingsContext'
import { useLlmHub } from '../contexts/LlmHubContext'
import Card from '../components/Card'
import Button from '../components/Button'

function formatModelLabel(model) {
    return `${model.displayName || model.modelId} (${model.providerId})`
}

function SettingsView() {
    const { settings, updateSetting } = useSettings()
    const { adapter, providers, connectedProviders, models, isLoading, error, refresh } = useLlmHub()
    const [selectedProviderId, setSelectedProviderId] = useState('')
    const [authMethods, setAuthMethods] = useState([])
    const [selectedAuthMethodId, setSelectedAuthMethodId] = useState('')
    const effectiveSelectedProviderId = selectedProviderId || providers[0]?.id || ''
    const selectedProvider = providers.find((provider) => provider.id === effectiveSelectedProviderId)
    const selectedAuthMethod = authMethods.find((method) => method.id === selectedAuthMethodId)
    const connectedLanguageModels = models.filter(
        (model) => model.connected && model.kind === 'language',
    )

    const handleClearData = () => {
        if (window.confirm('Are you sure you want to clear all saved data? This cannot be undone.')) {
            localStorage.clear()
            window.location.reload()
        }
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
                value={settings[settingKey] ? JSON.stringify(settings[settingKey]) : ''}
                onChange={(event) => {
                    updateSetting(settingKey, event.target.value ? JSON.parse(event.target.value) : null)
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

                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block">
                                <span className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                                    Provider
                                </span>
                                <select
                                    value={effectiveSelectedProviderId}
                                    onChange={(event) => setSelectedProviderId(event.target.value)}
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
                                    onChange={(event) => setSelectedAuthMethodId(event.target.value)}
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

                        {selectedProvider && selectedAuthMethod ? (
                            <ConnectionSchemaRenderer
                                adapter={adapter}
                                provider={selectedProvider}
                                authMethod={selectedAuthMethod}
                                hostMode="full_settings_page"
                                onMutation={async () => refresh()}
                                density="comfortable"
                            />
                        ) : null}
                    </div>
                )}
            </Card>

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
                            Clear all saved settings and evaluation data.
                        </p>
                    </div>
                </div>

                <Button variant="danger" size="sm" onClick={handleClearData}>
                    <Trash2 size={14} strokeWidth={2} />
                    Clear All Data
                </Button>
            </Card>
        </div>
    )
}

export default SettingsView
