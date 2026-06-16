import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
} from 'react'
import Input from '../../components/Input'
import styles from './PasswordInput.module.css'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: string
  label: string
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ error, id, label, name, ...props }, ref) {
    const generatedId = useId()
    const inputId = id ?? name ?? generatedId
    const [isVisible, setIsVisible] = useState(false)

    return (
      <Input
        error={error}
        id={inputId}
        label={label}
        name={name}
        ref={ref}
        rightElement={
          <button
            aria-controls={inputId}
            aria-label={isVisible ? 'Hide password' : 'Show password'}
            aria-pressed={isVisible}
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
  },
)

export default PasswordInput
