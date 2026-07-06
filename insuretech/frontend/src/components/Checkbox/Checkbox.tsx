import type { InputHTMLAttributes } from 'react'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

function Checkbox({ className = '', id, label, ...props }: CheckboxProps) {
  const inputId = id ?? props.name

  return (
    <label className={`inline-flex cursor-pointer items-center gap-[10px] text-[0.9rem] font-semibold text-[var(--color-text-secondary)] ${className}`} htmlFor={inputId}>
      <input className="sr-only" id={inputId} type="checkbox" {...props} />
      <span className="relative h-[18px] w-[18px] flex-none rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] transition duration-160 ease-out checked:border-[var(--color-secondary)] checked:bg-[var(--color-secondary)] peer" aria-hidden="true" />
      <span>{label}</span>
    </label>
  )
}

export default Checkbox
