import { useState } from 'react'
import { Eye, EyeOff, Trash2, Key, Cpu } from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'
import Card from '../components/Card'
import Button from '../components/Button'

const MODELS = [
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', speed: 'Fast' },
    { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5', speed: 'Balanced' },
    { value: 'claude-opus-4-5-20251101', label: 'Claude Opus 4.5', speed: 'Powerful' },
]

function SettingsView() {
    const {
        settings,
        setApiKey,
        updateSetting,
    } = useSettings()

    const [showApiKey, setShowApiKey] = useState(false)

    const handleClearData = () => {
        if (window.confirm('Are you sure you want to clear all saved data? This cannot be undone.')) {
            localStorage.clear()
            window.location.reload()
        }
    }

    return (
        <div className="animate-fade-in max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-3">
                    Settings
                </h1>
                <p className="text-[var(--color-text-secondary)] text-lg leading-relaxed">
                    Configure your API key and default preferences
                </p>
            </div>

            {/* API Key Section */}
            <Card padding="none" className="p-8 mb-6">
                <div className="flex items-start gap-5 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent-subtle)] flex items-center justify-center text-[var(--color-accent)] flex-shrink-0">
                        <Key size={22} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
                            API Key
                        </h2>
                        <p className="text-sm text-[var(--color-text-muted)]">
                            Required — stored locally in your browser
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="relative">
                        <input
                            type={showApiKey ? 'text' : 'password'}
                            value={settings.apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-ant-api03-..."
                            className="w-full pr-12 font-mono text-sm"
                        />
                        <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors rounded-lg hover:bg-[var(--color-bg-elevated)]"
                        >
                            {showApiKey ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                        </button>
                    </div>

                    <span className="text-sm text-[var(--color-text-muted)]">
                        Get your key from{' '}
                        <a
                            href="https://console.anthropic.com/settings/keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--color-accent)] hover:underline"
                        >
                            console.anthropic.com
                        </a>
                    </span>
                </div>
            </Card>

            {/* Model Defaults Section */}
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
                            Can be overridden per evaluation
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2.5">
                            Generation Model
                        </label>
                        <select
                            value={settings.defaultGenModel}
                            onChange={(e) => updateSetting('defaultGenModel', e.target.value)}
                            className="w-full"
                        >
                            {MODELS.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
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
                            {MODELS.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                        <p className="text-xs text-[var(--color-text-muted)] mt-2.5">
                            Used to evaluate and score outputs
                        </p>
                    </div>
                </div>
            </Card>

            {/* Data Management Section */}
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
