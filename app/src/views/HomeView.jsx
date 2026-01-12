import { Link } from 'react-router-dom'
import { Sliders, FlaskConical, Settings, ArrowRight, Sparkles, FileText, BarChart3 } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import { useSettings } from '../contexts/SettingsContext'

function HomeView() {
    const { needsApiKey } = useSettings()

    const features = [
        {
            icon: Sparkles,
            title: 'AI-Powered Generation',
            description: 'Generate prompts and judge criteria automatically based on your skill domain',
        },
        {
            icon: FileText,
            title: 'Any Skill, Any Domain',
            description: 'Compare frontend, backend, writing, analysis, or any custom skill files',
        },
        {
            icon: BarChart3,
            title: 'Detailed Scoring',
            description: 'Get breakdowns by criteria, see which skill wins and why',
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
            description: 'Run prompts through both skills, judge the outputs',
            link: '/evaluate',
        },
        {
            step: 3,
            title: 'Analyze',
            description: 'Review scores, breakdowns, and determine the winner',
            link: '/evaluate',
        },
    ]

    return (
        <div className="animate-fade-in">
            {/* Hero Section */}
            <section className="text-center pt-8 pb-20">
                <h1 className="text-5xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-6 leading-tight">
                    A/B Test Your AI Skills
                </h1>
                <p className="text-lg text-[var(--color-text-secondary)] max-w-xl mx-auto mb-10 leading-relaxed">
                    Compare two skill.md files side-by-side. Run the same prompts against both,
                    let an AI judge score the outputs, and see which skill performs better.
                </p>
                <div className="flex justify-center gap-4">
                    {needsApiKey ? (
                        <Link to="/settings">
                            <Button size="lg">
                                <Settings size={18} strokeWidth={2} />
                                Add API Key to Start
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
                </div>
            </section>

            {/* Features Grid */}
            <section className="pb-20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {features.map(({ icon: Icon, title, description }) => (
                        <Card key={title} padding="none" className="p-8 flex flex-col">
                            <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent-subtle)] flex items-center justify-center text-[var(--color-accent)] mb-6">
                                <Icon size={26} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
                                {title}
                            </h3>
                            <p className="text-[var(--color-text-secondary)] text-[15px] leading-relaxed">
                                {description}
                            </p>
                        </Card>
                    ))}
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
                <Card padding="none" className="p-10 text-center bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)]">
                    <p className="text-[var(--color-text-muted)] text-sm uppercase tracking-wider mb-4">
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
