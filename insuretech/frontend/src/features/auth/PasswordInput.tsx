import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
} from 'react'
import Input from '../../components/Input'

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
            className="min-w-[58px] rounded-[var(--radius-sm)] border-0 bg-transparent px-[10px] py-2 text-[0.82rem] font-extrabold text-[var(--color-secondary-dark)] transition hover:bg-[var(--color-surface-alt)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus-ring-secondary-strong)]"
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
