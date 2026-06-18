import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'

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
  const classNames = [
    styles.button,
    styles[variant],
    fullWidth ? styles.fullWidth : '',
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
