import { Link } from 'react-router-dom'
import { Sliders, AlertCircle } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import { useSettings } from '../contexts/SettingsContext'

function EvaluateView() {
    const { needsApiKey } = useSettings()

    // TODO: Check for valid configuration
    const hasConfig = false // Will be replaced with actual config check

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

    if (!hasConfig) {
        return (
            <div className="animate-fade-in max-w-md mx-auto text-center py-20">
                <div className="w-14 h-14 rounded-xl bg-[var(--color-accent-subtle)] flex items-center justify-center text-[var(--color-accent)] mx-auto mb-5">
                    <Sliders size={28} strokeWidth={1.5} />
                </div>
                <h1 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
                    No Evaluation Configured
                </h1>
                <p className="text-[var(--color-text-secondary)] text-sm mb-8 leading-relaxed">
                    Set up your evaluation first — choose a category, upload skills, and configure your prompts.
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

    // TODO: Full evaluation UI will go here
    return (
        <div className="animate-fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-2">
                    Evaluate
                </h1>
                <p className="text-[var(--color-text-secondary)]">
                    Run and judge your skill comparison
                </p>
            </div>

            <Card className="p-6">
                <p className="text-[var(--color-text-muted)]">
                    Evaluation UI coming soon...
                </p>
            </Card>
        </div>
    )
}

export default EvaluateView
