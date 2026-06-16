import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { AppDispatch } from '../../store/store'
import Button from '../../components/Button'
import {
  clearPasswordState,
  resetPassword,
  selectPasswordState,
} from './passwordSlice'
import { resetPasswordSchema } from './validation/resetPassword.schema'
import PasswordInput from './PasswordInput'
import styles from './LoginForm.module.css'

interface FormFields {
  password: string
  confirmPassword: string
}

function ResetPasswordForm() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { error, loading } = useSelector(selectPasswordState)

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

  // Clean up password state on unmount
  useEffect(() => {
    return () => {
      dispatch(clearPasswordState())
    }
  }, [dispatch])

  const onSubmit = async (data: FormFields) => {
    if (!token) {
      return
    }
    try {
      await dispatch(
        resetPassword({
          token,
          password: data.password,
          confirmPassword: data.confirmPassword,
        })
      ).unwrap()
      // Success: redirect to /login
      navigate('/login', { replace: true })
    } catch {
      // Error is stored in password Redux state
    }
  }

  // If token is missing, show error
  if (!token) {
    return (
      <div className={styles.form}>
        <header className={styles.header}>
          <h2>Invalid Link</h2>
          <p className={styles.formError} role="alert">
            Password reset token is missing. Please request a new link.
          </p>
        </header>
        <Button fullWidth onClick={() => navigate('/forgot-password')}>
          Go to Forgot Password
        </Button>
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
        <p className={styles.formError} role="alert">
          {error.toLowerCase().includes('token') || error.toLowerCase().includes('expired')
            ? 'Link invalid or expired'
            : error}
        </p>
      ) : null}

      <Button disabled={loading} fullWidth type="submit">
        {loading ? 'Resetting...' : 'Reset Password'}
      </Button>
    </form>
  )
}

export default ResetPasswordForm
