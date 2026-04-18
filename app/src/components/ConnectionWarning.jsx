import { Link } from 'react-router-dom'

function ConnectionWarning() {
    return (
        <div className="fixed top-16 left-0 right-0 z-40 bg-[var(--color-warning)] border-b border-[var(--color-border)]">
            <div className="max-w-5xl mx-auto px-8 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-medium text-[#2D2A1F]">
                    No provider connection configured. Nothing will run until you connect Gemini or Codex in Settings.
                </span>
                <Link
                    to="/settings"
                    className="text-sm font-semibold text-[#2D2A1F] underline underline-offset-4 hover:opacity-75 transition-opacity"
                >
                    Go to Settings
                </Link>
            </div>
        </div>
    )
}

export default ConnectionWarning
