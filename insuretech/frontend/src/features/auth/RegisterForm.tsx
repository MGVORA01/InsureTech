import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import Button from '../../components/Button'
import Input from '../../components/Input'
import { AUTH_MESSAGES } from './auth.constants'
import type { RegisterFormData } from './auth.types'
import PasswordInput from './PasswordInput'
import { useAuth } from './useAuth'
import { registerSchema } from './validation/register.schema'
import styles from './RegisterForm.module.css'

function RegisterForm() {
  const { error, loading, register: registerAccount } = useAuth()
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<RegisterFormData>({
    defaultValues: {
      companyName: '',
      confirmPassword: '',
      email: '',
      fullName: '',
      password: '',
    },
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    await registerAccount(data)
  }

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit(onSubmit)}>
      <header className={styles.header}>
        <h2>{AUTH_MESSAGES.registerTitle}</h2>
        <p>{AUTH_MESSAGES.registerSubtitle}</p>
      </header>

      <div className={styles.fields}>
        <Input
          autoComplete="name"
          error={errors.fullName?.message}
          label="Full Name"
          placeholder="Alex Morgan"
          type="text"
          {...register('fullName')}
        />
        <Input
          autoComplete="organization"
          error={errors.companyName?.message}
          label="Company Name"
          placeholder="Northstar Manufacturing"
          type="text"
          {...register('companyName')}
        />
        <Input
          autoComplete="email"
          error={errors.email?.message}
          label="Email"
          placeholder="name@company.com"
          type="email"
          {...register('email')}
        />
        <PasswordInput
          autoComplete="new-password"
          error={errors.password?.message}
          label="Password"
          placeholder="Create a strong password"
          {...register('password')}
        />
        <PasswordInput
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          label="Confirm Password"
          placeholder="Repeat your password"
          {...register('confirmPassword')}
        />
      </div>

      {error ? (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      ) : null}

      <Button disabled={loading} fullWidth type="submit">
        {loading ? 'Creating account...' : AUTH_MESSAGES.registerButton}
      </Button>

      <p className={styles.footer}>
        {AUTH_MESSAGES.hasAccount} <Link to="/login">{AUTH_MESSAGES.loginLink}</Link>
      </p>
    </form>
  )
}

export default RegisterForm
