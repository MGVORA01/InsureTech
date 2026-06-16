import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import Button from '../../components/Button'
import Checkbox from '../../components/Checkbox'
import Input from '../../components/Input'
import { AUTH_MESSAGES } from './auth.constants'
import type { LoginFormData } from './auth.types'
import PasswordInput from './PasswordInput'
import { useAuth } from './useAuth'
import { loginSchema } from './validation/login.schema'
import styles from './LoginForm.module.css'

function LoginForm() {
  const { error, loading, login } = useAuth()
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    await login(data)
  }

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit(onSubmit)}>
      <header className={styles.header}>
        <h2>{AUTH_MESSAGES.loginTitle}</h2>
        <p>{AUTH_MESSAGES.loginSubtitle}</p>
      </header>

      <div className={styles.fields}>
        <Input
          autoComplete="email"
          error={errors.email?.message}
          label="Email"
          placeholder="name@company.com"
          type="email"
          {...register('email')}
        />
        <PasswordInput
          autoComplete="current-password"
          error={errors.password?.message}
          label="Password"
          placeholder="Enter your password"
          {...register('password')}
        />
      </div>

      <div className={styles.actionsRow}>
        <Checkbox label={AUTH_MESSAGES.rememberMe} {...register('rememberMe')} />
        <Link to="/forgot-password">{AUTH_MESSAGES.forgotPassword}</Link>
      </div>

      {error ? (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      ) : null}

      <Button disabled={loading} fullWidth type="submit">
        {loading ? 'Logging in...' : AUTH_MESSAGES.loginButton}
      </Button>

      <p className={styles.footer}>
        {AUTH_MESSAGES.noAccount} <Link to="/register">{AUTH_MESSAGES.registerLink}</Link>
      </p>
    </form>
  )
}

export default LoginForm
