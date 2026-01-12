import { forwardRef } from 'react'

const variants = {
  primary: {
    base: 'bg-[var(--color-accent)] text-[#FFFFFF] shadow-md shadow-[var(--color-accent)]/20',
    hover: 'hover:bg-[var(--color-accent-hover)] hover:shadow-lg hover:shadow-[var(--color-accent)]/25',
  },
  secondary: {
    base: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)]',
    hover: 'hover:bg-[var(--color-bg-elevated)] hover:border-[var(--color-border-hover)]',
  },
  ghost: {
    base: 'bg-transparent text-[var(--color-text-secondary)]',
    hover: 'hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]',
  },
  danger: {
    base: 'bg-[var(--color-error)] text-[#FFFFFF] shadow-md shadow-[var(--color-error)]/20',
    hover: 'hover:opacity-90 hover:shadow-lg hover:shadow-[var(--color-error)]/25',
  },
}

const sizes = {
  sm: 'px-3 py-1.5 text-[13px] gap-1.5 rounded-lg',
  md: 'px-4 py-2 text-sm gap-2 rounded-lg',
  lg: 'px-5 py-2.5 text-[15px] gap-2 rounded-lg',
}

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  ...props
}, ref) => {
  const variantStyles = variants[variant] || variants.primary

  // Determine text color based on variant
  const getTextColor = () => {
    if (variant === 'primary' || variant === 'danger') return '#FFFFFF'
    if (variant === 'ghost') return 'var(--color-text-secondary)'
    return 'var(--color-text-primary)'
  }

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center
        font-medium
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
        ${variantStyles.base}
        ${!disabled && !loading ? variantStyles.hover : ''}
        ${sizes[size]}
        ${className}
      `}
      style={{ color: getTextColor() }}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  )
})

Button.displayName = 'Button'

export default Button
