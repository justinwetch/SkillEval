import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'

function ApiKeyWarning() {
    return (
        <div className="fixed top-16 left-0 right-0 z-40 bg-[var(--color-warning)]">
            <div className="max-w-5xl mx-auto px-8 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 text-[#2D2A1F]">
                    <AlertTriangle size={16} strokeWidth={2} />
                    <span className="text-sm font-medium">
                        No API key configured. Nothing will work until you add one.
                    </span>
                </div>
                <Link
                    to="/settings"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(45,42,31,0.85)] hover:bg-[rgba(45,42,31,1)] text-[#FFFFFF] text-sm font-semibold transition-colors shadow-sm"
                >
                    Add API Key
                    <ArrowRight size={14} strokeWidth={2.5} />
                </Link>
            </div>
        </div>
    )
}

export default ApiKeyWarning
