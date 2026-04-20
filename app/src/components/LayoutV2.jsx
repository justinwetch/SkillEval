import { NavLink, Outlet } from 'react-router-dom'
import { FlaskConical, History, Layers3, Moon, Settings, Sliders, Sparkles, Sun } from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'
import { useLlmHub } from '../contexts/LlmHubContext'

function LayoutV2() {
    const { settings, toggleTheme } = useSettings()
    const { connectedProviders } = useLlmHub()

    const navItems = [
        { path: '/v2/configure', label: 'Configure', icon: Sliders, description: 'Prepare skills and prompts' },
        { path: '/v2/evaluate', label: 'Evaluate', icon: FlaskConical, description: 'Run and judge evaluations' },
        { path: '/v2/history', label: 'History', icon: History, description: 'Saved runs and reloads' },
    ]

    const needsConnection = connectedProviders.length === 0

    return (
        <div className="theme-v2 h-screen overflow-hidden bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
            <div className="flex h-full">
                <aside className="hidden h-full w-62 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] lg:flex lg:flex-col">
                    <div className="border-b border-[var(--color-border)] px-4 py-4">
                        <NavLink to="/v2/evaluate" className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent)] text-white shadow-sm">
                                <Sparkles size={17} strokeWidth={1.8} />
                            </div>
                            <div>
                                <div className="text-base font-semibold tracking-tight">Skill Evaluator</div>
                                <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Workspace V2</div>
                            </div>
                        </NavLink>
                    </div>

                    <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) => `block rounded-xl border px-3 py-2.5 transition-all ${isActive ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-text-primary)]' : 'border-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.path.includes('/evaluate') ? 'bg-[var(--color-bg-primary)]' : 'bg-[var(--color-bg-tertiary)]'}`}>
                                            <Icon size={16} strokeWidth={1.8} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium leading-tight">{item.label}</div>
                                            <div className="truncate text-[11px] text-[var(--color-text-muted)]">{item.description}</div>
                                        </div>
                                    </div>
                                </NavLink>
                            )
                        })}
                    </nav>

                    <div className="space-y-2 border-t border-[var(--color-border)] p-3">
                        <NavLink
                            to="/v2/settings"
                            className={({ isActive }) => `flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${isActive ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-text-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'}`}
                        >
                            <Settings size={16} />
                            Settings
                        </NavLink>
                        <NavLink
                            to="/"
                            className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
                        >
                            <Layers3 size={16} />
                            Classic Layout
                        </NavLink>
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
                        >
                            {settings.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                            {settings.theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
                        </button>
                    </div>
                </aside>

                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <header className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/92 backdrop-blur">
                        <div className="mx-auto flex max-w-7xl items-start justify-between gap-4 px-5 py-4 lg:px-8">
                            <div className="min-w-0 space-y-3">
                                <div>
                                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Skill Workspace V2</div>
                                    <div className="text-[1.65rem] font-semibold tracking-tight text-[var(--color-text-primary)]">Evaluation Console</div>
                                </div>
                            </div>
                            {needsConnection ? (
                                <div className="rounded-full border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-3 py-1.5 text-sm text-[var(--color-warning)]">
                                    Connect a provider in Settings to run evaluations
                                </div>
                            ) : null}
                        </div>
                    </header>

                    <main className="min-h-0 flex-1 overflow-y-auto">
                        <div className="mx-auto max-w-7xl px-5 py-5 lg:px-8">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
        </div>
    )
}

export default LayoutV2
