import { Outlet, NavLink } from 'react-router-dom'
import { Settings, FlaskConical, Sliders, Sun, Moon, Sparkles } from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'
import { useLlmHub } from '../contexts/LlmHubContext'
import ConnectionWarning from './ConnectionWarning'

function Layout() {
    const { settings, toggleTheme } = useSettings()
    const { connectedProviders } = useLlmHub()
    const needsConnection = connectedProviders.length === 0

    const navItems = [
        { path: '/configure', label: 'Configure', icon: Sliders },
        { path: '/evaluate', label: 'Evaluate', icon: FlaskConical },
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
                        {navItems.map((item) => {
                            const IconComponent = item.icon

                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) => `
                                        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                                        ${isActive
                                            ? 'bg-[var(--color-accent)] text-[#FFFFFF]'
                                            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
                                        }
                                    `}
                                >
                                    <IconComponent size={16} strokeWidth={2} />
                                    {item.label}
                                </NavLink>
                            )
                        })}
                    </nav>

                    <div className="absolute right-8 flex items-center gap-2">
                        <NavLink
                            to="/v2/evaluate"
                            className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] transition-all flex items-center gap-2"
                        >
                            <Sparkles size={14} strokeWidth={1.8} />
                            V2
                        </NavLink>
                        <NavLink
                            to="/settings"
                            className={({ isActive }) => `
                                w-9 h-9 rounded-lg flex items-center justify-center border transition-all
                                ${isActive
                                    ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                                    : 'bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-elevated)]'
                                }
                            `}
                            aria-label="Open settings"
                        >
                            <Settings size={18} strokeWidth={1.5} />
                        </NavLink>
                        <button
                            onClick={toggleTheme}
                            className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-elevated)] transition-all"
                            aria-label={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} mode`}
                        >
                            {settings.theme === 'dark' ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Provider Connection Warning Banner */}
            {needsConnection && <ConnectionWarning />}

            {/* Main Content */}
            <main className={`pt-16 min-h-screen ${needsConnection ? 'mt-12' : ''}`}>
                <div className="max-w-5xl mx-auto px-8 py-12">
                    <Outlet />
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-[var(--color-border)] py-6 bg-[var(--color-bg-secondary)]">
                <div className="max-w-5xl mx-auto px-8 text-center text-sm text-[var(--color-text-muted)]">
                    <span>Created by </span>
                    <a
                        href="https://www.justinwetch.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
                    >
                        Justin Wetch
                    </a>
                </div>
            </footer>
        </div>
    )
}

export default Layout
