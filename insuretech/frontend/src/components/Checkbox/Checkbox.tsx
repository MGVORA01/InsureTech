import type { InputHTMLAttributes } from 'react'
import styles from './Checkbox.module.css'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

function Checkbox({ className = '', id, label, ...props }: CheckboxProps) {
  const inputId = id ?? props.name

  return (
    <label className={`${styles.checkbox} ${className}`} htmlFor={inputId}>
      <input className={styles.input} id={inputId} type="checkbox" {...props} />
      <span className={styles.control} aria-hidden="true" />
      <span>{label}</span>
    </label>
  )
}

export default Checkbox
