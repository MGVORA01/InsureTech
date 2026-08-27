import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label: string
  rightElement?: ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', error, id, label, rightElement, ...props },
  ref,
) {
  const inputId = id ?? props.name
  const errorId = error && inputId ? `${inputId}-error` : undefined

  return (
    <div className="grid gap-2">
      <label className="text-[0.92rem] font-bold text-[var(--color-text-primary)]" htmlFor={inputId}>
        {label}
      </label>
      <div className={`flex min-h-[46px] items-center overflow-hidden rounded-[var(--radius-md)] border bg-[var(--color-surface)] transition duration-160 ease-out focus-within:border-[var(--color-secondary)] focus-within:shadow-[0_0_0_3px_var(--focus-ring-secondary-soft)] ${error ? 'border-[var(--color-risk-high)] focus-within:border-[var(--color-risk-high)] focus-within:shadow-[0_0_0_3px_var(--focus-ring-danger)]' : 'border-[var(--color-border-strong)]'}`}>
        <input
          aria-describedby={errorId}
          aria-invalid={Boolean(error)}
          className={`w-full min-w-0 border-0 bg-transparent px-[14px] py-3 text-[var(--color-text-primary)] outline-0 placeholder:text-[var(--color-text-tertiary)] ${className}`}
          id={inputId}
          ref={ref}
          {...props}
        />
        {rightElement ? <div className="inline-flex flex-none items-center pr-[6px]">{rightElement}</div> : null}
      </div>
      {error ? (
        <p className="m-0 text-[0.84rem] leading-[1.35] text-[var(--color-risk-high)]" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
})

export default Input
