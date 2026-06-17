import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import type { AppDispatch } from '../../store/store'
import Button from '../../components/Button'
import Input from '../../components/Input'
import { AUTH_MESSAGES } from './auth.constants'
import type { ForgotPasswordRequest } from './auth.types'
import {
  clearPasswordState,
  forgotPassword,
  selectPasswordState,
} from './passwordSlice'
import { forgotPasswordSchema } from './validation/forgotPassword.schema'
import styles from './LoginForm.module.css'

function ForgotPasswordForm() {
  const dispatch = useDispatch<AppDispatch>()
  const { error, loading, message } = useSelector(selectPasswordState)
  const [countdown, setCountdown] = useState(0)

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<ForgotPasswordRequest>({
    defaultValues: {
      email: '',
    },
    resolver: zodResolver(forgotPasswordSchema),
  })

  // Clean up password state on unmount
  useEffect(() => {
    return () => {
      dispatch(clearPasswordState())
    }
  }, [dispatch])

  // Countdown timer for disabling resubmission
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // const onSubmit = async (data: ForgotPasswordRequest) => {
  //   try {
  //     await dispatch(forgotPassword(data)).unwrap()
  //     setCountdown(60) // Disable submit for 60s on success
  //   } catch {
  //     // Error is stored in password Redux state
  //   }
  // }
  const onSubmit = async (data: ForgotPasswordRequest) => {
    console.log("Forgot password submit", data)

    try {
      const result = await dispatch(forgotPassword(data)).unwrap()
      console.log("Success", result)

      setCountdown(60)
    } catch (err) {
      console.error("Forgot password failed", err)
    }
  }

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit(onSubmit)}>
      <header className={styles.header}>
        <h2>Forgot Password</h2>
        <p>Enter your email address to receive a password reset link.</p>
      </header>

      <div className={styles.fields}>
        <Input
          autoComplete="email"
          error={errors.email?.message}
          label="Email Address"
          placeholder="name@company.com"
          type="email"
          {...register('email')}
        />
      </div>

      {error ? (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      ) : null}

      {message ? (
        <p
          className={styles.formSuccess || styles.formError}
          style={{
            margin: 0,
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            color: 'var(--color-risk-low)',
            background: 'var(--color-risk-low-bg)',
            fontSize: '0.9rem',
            fontWeight: 700,
          }}
          role="status"
        >
          {message}
        </p>
      ) : null}

      <Button
        disabled={loading || countdown > 0}
        fullWidth
        type="submit"
      >
        {loading
          ? 'Sending link...'
          : countdown > 0
            ? `Resend in ${countdown}s`
            : 'Send Reset Link'}
      </Button>

      <p className={styles.footer}>
        Remembered your password?{' '}
        <Link to="/login">{AUTH_MESSAGES.loginLink}</Link>
      </p>
    </form>
  )
}

export default ForgotPasswordForm
