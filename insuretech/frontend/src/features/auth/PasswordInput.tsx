import { useState, type InputHTMLAttributes } from 'react'
import Input from '../../components/Input'
import styles from './PasswordInput.module.css'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: string
  label: string
}

function PasswordInput({ error, label, ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <Input
      error={error}
      label={label}
      rightElement={
        <button
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          className={styles.toggle}
          onClick={() => setIsVisible((current) => !current)}
          type="button"
        >
          {isVisible ? 'Hide' : 'Show'}
        </button>
      }
      type={isVisible ? 'text' : 'password'}
      {...props}
    />
  )
}

export default PasswordInput
