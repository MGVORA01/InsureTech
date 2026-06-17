import styles from './PasswordRequirements.module.css'

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
      className={styles.requirements}
    >
      <ul className={styles.list}>
        {requirements.map((requirement) => (
          <li
            className={`${styles.item} ${
              requirement.isValid ? styles.valid : styles.invalid
            }`}
            key={requirement.label}
          >
            <span aria-hidden="true" className={styles.icon}>
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
