const variants = {
    default: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border-[var(--color-border)]',
    success: 'bg-[var(--color-success-subtle)] text-[var(--color-success)] border-[var(--color-success)]',
    warning: 'bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border-[var(--color-warning)]',
    error: 'bg-[var(--color-error-subtle)] text-[var(--color-error)] border-[var(--color-error)]',
    info: 'bg-[var(--color-info-subtle)] text-[var(--color-info)] border-[var(--color-info)]',
    accent: 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border-[var(--color-border)]',
}

const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
}

function Badge({
    children,
    variant = 'default',
    size = 'md',
    className = '',
    ...props
}) {
    return (
        <span
            className={`
                inline-flex items-center font-medium rounded-[var(--radius-sm)] border
                ${variants[variant]}
                ${sizes[size]}
                ${className}
            `}
            {...props}
        >
            {children}
        </span>
    )
}

export default Badge
