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

interface ForgotPasswordFormProps {
  onLogin?: () => void
}

function ForgotPasswordForm({ onLogin }: ForgotPasswordFormProps) {
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

  const onSubmit = async (data: ForgotPasswordRequest) => {
    try {
      await dispatch(forgotPassword(data)).unwrap()
      setCountdown(60)
    } catch {
      // Error is stored in password Redux state.
    }
  }

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit(onSubmit)}>
      <header className="flex flex-col gap-2 text-center">
        <h2 className="m-0 text-[1.375rem] font-semibold text-text-primary">Forgot Password</h2>
        <p className="m-0 text-sm leading-6 text-text-secondary">Enter your email address to receive a password reset link.</p>
      </header>

      <div className="flex flex-col gap-3">
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
        <p className="rounded-[var(--radius-md)] border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.08)] px-3 py-2 text-sm text-risk-high" role="alert">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="rounded-[var(--radius-md)] border border-[rgba(46,125,50,0.2)] bg-[rgba(46,125,50,0.08)] px-3 py-2 text-sm text-green-700" role="status">
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

      <p className="mt-1 text-center text-sm text-text-secondary">
        Remembered your password?{' '}
        {onLogin ? (
          <button className="ml-1 border-none bg-transparent p-0 font-semibold text-primary underline-offset-2 hover:underline" onClick={onLogin} type="button">
            {AUTH_MESSAGES.loginLink}
          </button>
        ) : (
          <Link className="ml-1 font-semibold text-primary underline-offset-2 hover:underline" to="/login">{AUTH_MESSAGES.loginLink}</Link>
        )}
      </p>
    </form>
  )
}

export default ForgotPasswordForm
