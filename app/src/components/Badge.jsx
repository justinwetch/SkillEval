const variants = {
    default: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]',
    success: 'bg-[rgba(123,158,127,0.2)] text-[#9BC49F]',
    warning: 'bg-[rgba(212,168,83,0.2)] text-[#E8B84A]',
    error: 'bg-[rgba(196,92,62,0.2)] text-[#E07050]',
    info: 'bg-[rgba(122,155,190,0.2)] text-[#9ABADE]',
    accent: 'bg-[var(--color-accent-subtle)] text-[#E8886A]',
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
                inline-flex items-center font-medium rounded-md
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
