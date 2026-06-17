import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams, Link } from 'react-router-dom'
import Button from '../../components/Button'
import { resetPasswordSchema } from './validation/resetPassword.schema'
import PasswordInput from './PasswordInput'
import styles from './LoginForm.module.css'

interface FormFields {
  password: string
  confirmPassword: string
}

function ResetPasswordForm() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [submitted, setSubmitted] = useState(false)

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<FormFields>({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = (data: FormFields) => {
    if (!token) return
    setSubmitted(true)
  }

  if (!token) {
    return (
      <div className={styles.form}>
        <header className={styles.header}>
          <h2>Invalid Link</h2>
          <p className={styles.formError} role="alert">
            Password reset token is missing. Please request a new link.
          </p>
        </header>
        <Link to="/forgot-password">
          <Button fullWidth>Go to Forgot Password</Button>
        </Link>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className={styles.form}>
        <header className={styles.header} style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2>Password Reset Successfully</h2>
          <p>Your password has been reset successfully. Now you can login with your new password.</p>
        </header>
        <Link to="/login">
          <Button fullWidth>Login</Button>
        </Link>
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

      <Button fullWidth type="submit">
        Reset Password
      </Button>
    </form>
  )
}

export default ResetPasswordForm
