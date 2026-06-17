import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams, Link } from 'react-router-dom'
import Button from '../../components/Button'
import { resetPasswordSchema } from './validation/resetPassword.schema'
import PasswordInput from './PasswordInput'
import { authApi, getAuthErrorMessage } from './authApi'
import styles from './LoginForm.module.css'

type PageState = 'form' | 'submitting' | 'success' | 'invalidToken' | 'tokenUsed'

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const decoded = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token)
  if (!payload) return true
  const exp = payload.exp as number | undefined
  if (!exp) return true
  return Date.now() >= exp * 1000
}

interface FormFields {
  password: string
  confirmPassword: string
}

function ResetPasswordForm() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [pageState, setPageState] = useState<PageState>(() => {
    if (!token) return 'invalidToken'
    if (isTokenExpired(token)) return 'invalidToken'
    return 'form'
  })
  const [error, setError] = useState<string | null>(null)

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<FormFields>({
    defaultValues: { password: '', confirmPassword: '' },
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data: FormFields) => {
    if (!token) return
    setPageState('submitting')
    setError(null)
    try {
      await authApi.resetPassword({
        token,
        password: data.password,
        confirmPassword: data.confirmPassword,
      })
      setPageState('success')
    } catch (err) {
      const msg = getAuthErrorMessage(err).toLowerCase()
      if (msg.includes('not found') || msg.includes('used') || msg.includes('invalid')) {
        setPageState('tokenUsed')
      } else {
        setError(getAuthErrorMessage(err))
        setPageState('form')
      }
    }
  }

  if (!token || pageState === 'invalidToken') {
    return (
      <div className={styles.form}>
        <header className={styles.header} style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: '50%', backgroundColor: '#dc2626',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </div>
          <h2>Link Expired</h2>
          <p>Reset password link has expired. Please try again.</p>
        </header>
        {/*<Link to="/forgot-password">*/}
        {/*  <Button fullWidth>Go to Forgot Password</Button>*/}
        {/*</Link>*/}
      </div>
    )
  }

  if (pageState === 'tokenUsed') {
    return (
      <div className={styles.form}>
        <header className={styles.header} style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: '50%', backgroundColor: '#dc2626',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </div>
          <h2>Link Already Used</h2>
          <p>This link has already been used. Please generate a new one.</p>
        </header>
        {/*<Link to="/forgot-password">*/}
        {/*  <Button fullWidth>Go to Forgot Password</Button>*/}
        {/*</Link>*/}
      </div>
    )
  }

  if (pageState === 'success') {
    return (
      <div className={styles.form}>
        <header className={styles.header} style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: '50%', backgroundColor: '#16a34a',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2>Password Reset Successfully</h2>
          <p>Your password has been reset successfully. Now you can login with your new password.</p>
        </header>
        {/*<Link to="/login">*/}
        {/*  <Button fullWidth>Login</Button>*/}
        {/*</Link>*/}
      </div>
    )
  }

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit(onSubmit)}>
      <header className={styles.header}>
        <h2>Reset Password</h2>
        <p>Create a new strong password for your account.</p>
      </header>

      <div className={styles.fields}>
        <PasswordInput
          autoComplete="new-password"
          error={errors.password?.message}
          label="New Password"
          placeholder="Enter new password"
          {...register('password')}
        />
        <PasswordInput
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          label="Confirm New Password"
          placeholder="Repeat new password"
          {...register('confirmPassword')}
        />
      </div>

      {error ? (
        <p className={styles.formError} role="alert">{error}</p>
      ) : null}

      <Button disabled={pageState === 'submitting'} fullWidth type="submit">
        {pageState === 'submitting' ? 'Resetting...' : 'Reset Password'}
      </Button>
    </form>
  )
}

export default ResetPasswordForm
