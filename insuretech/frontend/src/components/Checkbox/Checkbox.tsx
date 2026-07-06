import type { InputHTMLAttributes } from 'react'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

function Checkbox({ className = '', id, label, ...props }: CheckboxProps) {
  const inputId = id ?? props.name

  return (
    <label className={`inline-flex cursor-pointer items-center text-[0.9rem] font-semibold text-[var(--color-text-secondary)] ${className}`} htmlFor={inputId}>
      <input className="sr-only peer" id={inputId} type="checkbox" {...props} />
      <span className="h-[18px] w-[18px] flex-none rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] transition duration-160 ease-out peer-checked:border-[var(--color-cta)] peer-checked:bg-[var(--color-cta)]" aria-hidden="true" />
      <span className="flex h-[18px] w-[18px] flex-none items-center justify-center text-[var(--color-cta-contrast)] text-[12px] leading-none opacity-0 transition duration-160 ease-out peer-checked:opacity-100 -ml-[18px] mr-[10px]" aria-hidden="true">✓</span>
      <span>{label}</span>
    </label>
  )
}

export default Checkbox
