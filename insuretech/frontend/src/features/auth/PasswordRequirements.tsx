
interface PasswordRequirement {
  label: string
  isValid: boolean
}

interface PasswordRequirementsProps {
  password: string
}

function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      label: 'At least 8 characters',
      isValid: password.length >= 8,
    },
    {
      label: 'One uppercase letter',
      isValid: /[A-Z]/.test(password),
    },
    {
      label: 'One lowercase letter',
      isValid: /[a-z]/.test(password),
    },
    {
      label: 'One number',
      isValid: /\d/.test(password),
    },
    {
      label: 'One special character',
      isValid: /[^A-Za-z\d]/.test(password),
    },
  ]
}

function PasswordRequirements({ password }: PasswordRequirementsProps) {
  if (!password) {
    return null
  }

  const requirements = getPasswordRequirements(password)

  return (
    <section
      aria-label="Password requirements"
      aria-live="polite"
      className="mt-[-6px] grid gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-3"
    >
      <ul className="m-0 grid list-none gap-[7px] p-0">
        {requirements.map((requirement) => (
          <li
            className={`flex min-h-5 items-center gap-2 text-[0.86rem] font-bold leading-[1.35] ${requirement.isValid ? 'text-[var(--color-risk-low)]' : 'text-[var(--color-risk-high)]'}`}
            key={requirement.label}
          >
            <span aria-hidden="true" className={`inline-grid h-[18px] w-[18px] flex-none place-items-center rounded-full text-[0.78rem] font-black leading-none ${requirement.isValid ? 'bg-[var(--color-risk-low-bg)] text-[var(--color-risk-low)]' : 'bg-[var(--color-risk-high-bg)] text-[var(--color-risk-high)]'}`}>
              {requirement.isValid ? '✓' : '✗'}
            </span>
            <span>{requirement.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default PasswordRequirements
