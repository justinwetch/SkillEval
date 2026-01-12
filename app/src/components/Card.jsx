import { forwardRef } from 'react'

const Card = forwardRef(({
    children,
    className = '',
    interactive = false,
    accent = false,
    padding = 'default',
    onClick,
    ...props
}, ref) => {
    const Component = onClick ? 'button' : 'div'

    const paddingStyles = {
        none: '',
        sm: 'p-5',
        default: 'p-6',
        lg: 'p-8',
    }

    return (
        <Component
            ref={ref}
            onClick={onClick}
            className={`
        bg-[var(--color-bg-secondary)]
        border border-[var(--color-border)]
        rounded-xl
        transition-all duration-200
        ${paddingStyles[padding]}
        ${interactive || onClick ? 'cursor-pointer hover:bg-[var(--color-bg-tertiary)] hover:border-[var(--color-border-hover)]' : 'hover:border-[var(--color-border-hover)]'}
        ${accent ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)]' : ''}
        ${onClick ? 'text-left w-full' : ''}
        ${className}
      `}
            {...props}
        >
            {children}
        </Component>
    )
})

Card.displayName = 'Card'

export default Card
