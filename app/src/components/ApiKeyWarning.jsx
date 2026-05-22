import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'

function ApiKeyWarning() {
    return (
        <div className="fixed top-16 left-0 right-0 z-40 bg-[var(--color-warning)]">
            <div className="max-w-5xl mx-auto px-8 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 text-[var(--color-on-warning)]">
                    <AlertTriangle size={16} strokeWidth={2} />
                    <span className="text-sm font-medium">
                        No provider key configured. Add one before running evaluations.
                    </span>
                </div>
                <Link
                    to="/settings"
                    className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] text-sm font-semibold transition-colors shadow-[var(--shadow-sm)]"
                >
                    Add Provider Key
                    <ArrowRight size={14} strokeWidth={2.5} />
                </Link>
            </div>
        </div>
    )
}

export default ApiKeyWarning
