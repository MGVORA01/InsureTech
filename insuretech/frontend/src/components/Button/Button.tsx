import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  fullWidth?: boolean
  variant?: 'primary' | 'secondary'
}

function Button({
  children,
  className = '',
  fullWidth = false,
  variant = 'primary',
  ...props
}: ButtonProps) {
  const variantClasses = {
    primary: 'border-transparent bg-[var(--color-cta)] text-[var(--color-cta-contrast)] shadow-[var(--shadow-cta)] hover:not-disabled:border-[var(--color-cta-hover)] hover:not-disabled:bg-[var(--color-cta-hover)]',
    secondary: 'border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-primary)] hover:not-disabled:border-[var(--color-secondary)] hover:not-disabled:text-[var(--color-secondary-dark)]',
  }

  const classNames = [
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-md)] border px-[18px] font-bold leading-none transition duration-160 ease-out disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-secondary)]',
    variantClasses[variant],
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={classNames} {...props}>
      {children}
    </button>
  )
}

export default Button
