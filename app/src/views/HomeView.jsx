import { Link } from 'react-router-dom'
import { Sliders, FlaskConical, Settings, ArrowRight, Sparkles, FileText, BarChart3 } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import { useLlmHub } from '../contexts/LlmHubContext'

function HomeView() {
    const { connectedProviders } = useLlmHub()
    const needsProviderConnection = connectedProviders.length === 0

    const features = [
        {
            icon: Sparkles,
            title: 'AI-Powered Generation',
            description: 'Generate prompts and judging criteria automatically from your uploaded skill set',
        },
        {
            icon: FileText,
            title: 'Any Skill, Any Domain',
            description: 'Benchmark frontend, backend, writing, analysis, or any custom skill files',
        },
        {
            icon: BarChart3,
            title: 'Detailed Scoring',
            description: 'See leaderboards, challenger matchups, and criterion-level scoring details',
        },
    ]

    const steps = [
        {
            step: 1,
            title: 'Configure',
            description: 'Choose your domain, upload skills, set up criteria',
            link: '/configure',
        },
        {
            step: 2,
            title: 'Evaluate',
            description: 'Run prompts through the baseline and challengers, then score the outputs',
            link: '/evaluate',
        },
        {
            step: 3,
            title: 'Analyze',
            description: 'Review rankings, breakdowns, and determine which skills perform best',
            link: '/evaluate',
        },
    ]

    return (
        <div className="animate-fade-in">
            {/* Hero Section */}
            <section className="text-center pt-8 pb-20">
                <h1 className="text-5xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-6 leading-tight">
                    Benchmark Your AI Skills
                </h1>
                <p
                    className="text-lg text-[var(--color-text-secondary)] leading-relaxed text-center"
                    style={{ maxWidth: '580px', margin: '0 auto 40px auto' }}
                >
                    Compare up to five skill files in one benchmark set. Run the same prompts against a baseline and multiple challengers, let an AI judge score the outputs, and see how they rank.
                </p>
                <div className="flex justify-center gap-4">
                    {needsProviderConnection ? (
                        <Link to="/settings">
                            <Button size="lg">
                                <Settings size={18} strokeWidth={2} />
                                Connect Provider to Start
                            </Button>
                        </Link>
                    ) : (
                        <Link to="/configure">
                            <Button size="lg">
                                <Sliders size={18} strokeWidth={2} />
                                Start Configuring
                                <ArrowRight size={18} strokeWidth={2} />
                            </Button>
                        </Link>
                    )}
                    <a
                        href="https://github.com/justinwetch/SkillEval"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Button variant="secondary" size="lg">
                            View on GitHub
                        </Button>
                    </a>
                    <Link to="/v2/evaluate">
                        <Button variant="ghost" size="lg">
                            Try V2 Workspace
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Features Grid */}
            <section className="pb-20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {features.map((feature) => {
                        const IconComponent = feature.icon

                        return (
                            <Card key={feature.title} padding="none" className="p-8 flex flex-col">
                                <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent-subtle)] flex items-center justify-center text-[var(--color-accent)] mb-6">
                                    <IconComponent size={26} strokeWidth={1.5} />
                                </div>
                                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
                                    {feature.title}
                                </h3>
                                <p className="text-[var(--color-text-secondary)] text-[15px] leading-relaxed">
                                    {feature.description}
                                </p>
                            </Card>
                        )
                    })}
                </div>
            </section>

            {/* How It Works */}
            <section className="pb-20">
                {/* Section Header with lines */}
                <div className="flex items-center gap-6 mb-10">
                    <div className="flex-1 h-px bg-[var(--color-border)]" />
                    <h2 className="text-sm font-medium text-[var(--color-text-muted)] uppercase tracking-widest">
                        How It Works
                    </h2>
                    <div className="flex-1 h-px bg-[var(--color-border)]" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {steps.map(({ step, title, description, link }) => (
                        <Link key={step} to={link} className="group">
                            <Card
                                interactive
                                padding="none"
                                className="p-8 h-full flex flex-col transition-transform duration-200 group-hover:-translate-y-1"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-11 h-11 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white text-lg font-semibold shadow-lg shadow-[var(--color-accent)]/20">
                                        {step}
                                    </div>
                                    <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">
                                        {title}
                                    </h3>
                                </div>
                                <p className="text-[var(--color-text-secondary)] text-[15px] leading-relaxed">
                                    {description}
                                </p>
                            </Card>
                        </Link>
                    ))}
                </div>
            </section>

            {/* CTA Footer */}
            <section>
                <Card padding="none" className="text-center bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)]" style={{ padding: '48px 32px' }}>
                    <p className="text-[var(--color-text-muted)] text-sm uppercase tracking-wider" style={{ marginBottom: '24px' }}>
                        Ready to get started?
                    </p>
                    <div className="flex justify-center gap-4">
                        <Link to="/configure">
                            <Button variant="primary">
                                <Sliders size={16} strokeWidth={2} />
                                Configure Evaluation
                            </Button>
                        </Link>
                        <Link to="/settings">
                            <Button variant="ghost">
                                <Settings size={16} strokeWidth={2} />
                                Settings
                            </Button>
                        </Link>
                    </div>
                </Card>
            </section>
        </div>
    )
}

export default HomeView
