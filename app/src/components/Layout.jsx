import { Outlet, NavLink } from 'react-router-dom'
import { Settings, FlaskConical, Sliders, Sun, Moon } from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'
import ApiKeyWarning from './ApiKeyWarning'

function Layout() {
    const { settings, toggleTheme, needsApiKey } = useSettings()

    const navItems = [
        { path: '/configure', label: 'Configure', icon: Sliders },
        { path: '/evaluate', label: 'Evaluate', icon: FlaskConical },
        { path: '/settings', label: 'Settings', icon: Settings },
    ]

    return (
        <div className="min-h-screen bg-[var(--color-bg-primary)] transition-colors duration-200">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-[var(--color-border)]">
                <div className="max-w-5xl mx-auto px-8 h-16 flex items-center justify-center relative">
                    {/* Logo - Positioned Left */}
                    <NavLink to="/" className="absolute left-8 flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[#B85D3F] flex items-center justify-center shadow-lg shadow-[var(--color-accent)]/20">
                            <FlaskConical size={18} strokeWidth={2} className="text-white" />
                        </div>
                        <span className="text-lg font-semibold text-[var(--color-text-primary)] tracking-tight">
                            Skill Evaluator
                        </span>
                    </NavLink>

                    {/* Navigation - Centered */}
                    <nav className="flex items-center gap-1">
                        {navItems.map(({ path, label, icon: Icon }) => (
                            <NavLink
                                key={path}
                                to={path}
                                className={({ isActive }) => `
                                    flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                                    ${isActive
                                        ? 'bg-[var(--color-accent)] text-[#FFFFFF]'
                                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
                                    }
                                `}
                            >
                                <Icon size={16} strokeWidth={2} />
                                {label}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Theme Toggle - Positioned Right */}
                    <button
                        onClick={toggleTheme}
                        className="absolute right-8 w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-elevated)] transition-all"
                        aria-label={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {settings.theme === 'dark' ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
                    </button>
                </div>
            </header>

            {/* API Key Warning Banner */}
            {needsApiKey && <ApiKeyWarning />}

            {/* Main Content */}
            <main className={`pt-16 min-h-screen ${needsApiKey ? 'mt-12' : ''}`}>
                <div className="max-w-5xl mx-auto px-8 py-12">
                    <Outlet />
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-[var(--color-border)] py-6 bg-[var(--color-bg-secondary)]">
                <div className="max-w-5xl mx-auto px-8 text-center text-sm text-[var(--color-text-muted)]">
                    <a
                        href="https://github.com/justinwetch/SkillEval"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
                    >
                        Skill Evaluator
                    </a>
                    <span className="mx-2 text-[var(--color-border)]">·</span>
                    <span>Open source A/B testing for AI skills</span>
                </div>
            </footer>
        </div>
    )
}

export default Layout
