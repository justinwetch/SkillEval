import { forwardRef } from 'react'

const variants = {
  primary: {
    base: 'bg-[var(--color-accent)] text-[var(--color-on-accent)] shadow-[var(--shadow-sm)] border border-[var(--color-accent)]',
    hover: 'hover:bg-[var(--color-accent-hover)] hover:border-[var(--color-accent-hover)] hover:shadow-[var(--shadow-md)]',
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
    base: 'bg-[var(--color-error)] text-[var(--color-on-danger)] shadow-[var(--shadow-sm)] border border-[var(--color-error)]',
    hover: 'hover:opacity-90 hover:shadow-[var(--shadow-md)]',
  },
}

const sizes = {
  sm: 'px-3 py-1.5 text-[13px] gap-1.5 rounded-[var(--radius-sm)]',
  md: 'px-4 py-2 text-sm gap-2 rounded-[var(--radius-sm)]',
  lg: 'px-5 py-2.5 text-[15px] gap-2 rounded-[var(--radius-md)]',
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
