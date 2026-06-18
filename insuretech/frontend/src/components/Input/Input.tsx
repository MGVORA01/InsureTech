import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import styles from './Input.module.css'

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
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <div className={`${styles.inputShell} ${error ? styles.invalid : ''}`}>
        <input
          aria-describedby={errorId}
          aria-invalid={Boolean(error)}
          className={`${styles.input} ${className}`}
          id={inputId}
          ref={ref}
          {...props}
        />
        {rightElement ? <div className={styles.rightElement}>{rightElement}</div> : null}
      </div>
      {error ? (
        <p className={styles.error} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
})

export default Input
