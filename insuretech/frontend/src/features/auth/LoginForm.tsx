import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../../components/Button'
import Checkbox from '../../components/Checkbox'
import Input from '../../components/Input'
import { AUTH_MESSAGES } from './auth.constants'
import type { LoginFormData } from './auth.types'
import PasswordInput from './PasswordInput'
import { useAuth } from '../../hooks/useAuth'
import { loginSchema } from './validation/login.schema'

interface LoginFormProps {
    onForgotPassword?: () => void
    onRegister?: () => void
}

function LoginForm({ onForgotPassword, onRegister }: LoginFormProps) {
    const navigate = useNavigate()
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
        try {
            const result = await login(data)
            if (result?.user?.role === 'ADMIN') {
                navigate('/admin/dashboard', { replace: true })
            } else {
                navigate('/dashboard', { replace: true })
            }
        } catch {
            // Auth errors are stored in Redux by the async thunks.
        }
    }

    return (
        <form className="grid w-full max-w-[440px] justify-self-center gap-6 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-card)] sm:p-8" noValidate onSubmit={handleSubmit(onSubmit)}>
            <header className="grid gap-2">
                <h2 className="m-0 text-[1.85rem] leading-[1.15] text-[var(--color-primary)]">{AUTH_MESSAGES.loginTitle}</h2>
                <p className="m-0 leading-[1.55] text-[var(--color-text-secondary)]">{AUTH_MESSAGES.loginSubtitle}</p>
            </header>

            <div className="grid gap-[18px]">
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

            <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-start">
                <Checkbox label={AUTH_MESSAGES.rememberMe} {...register('rememberMe')} />
                {onForgotPassword ? (
                    <button
                        className="border-0 bg-transparent p-0 font-extrabold text-[var(--color-secondary)] underline-offset-2 hover:text-[var(--color-secondary-dark)] hover:underline"
                        onClick={onForgotPassword}
                        type="button"
                    >
                        {AUTH_MESSAGES.forgotPassword}
                    </button>
                ) : (
                    <Link className="font-extrabold text-[var(--color-secondary)] hover:text-[var(--color-secondary-dark)] hover:underline" to="/forgot-password">{AUTH_MESSAGES.forgotPassword}</Link>
                )}
            </div>

            {error ? (
                <p className="m-0 rounded-[var(--radius-md)] bg-[var(--color-risk-high-bg)] p-3 text-sm font-bold text-[var(--color-risk-high)]" role="alert">
                    {error}
                </p>
            ) : null}

            <Button disabled={loading} fullWidth type="submit">
                {loading ? 'Logging in...' : AUTH_MESSAGES.loginButton}
            </Button>

            <p className="m-0 text-center leading-[1.55] text-[var(--color-text-secondary)]">
                {AUTH_MESSAGES.noAccount}{' '}
                {onRegister ? (
                    <button
                        className="border-0 bg-transparent p-0 font-extrabold text-[var(--color-secondary)] hover:text-[var(--color-secondary-dark)] hover:underline"
                        onClick={onRegister}
                        type="button"
                    >
                        {AUTH_MESSAGES.registerLink}
                    </button>
                ) : (
                    <Link className="font-extrabold text-[var(--color-secondary)] hover:text-[var(--color-secondary-dark)] hover:underline" to="/register">{AUTH_MESSAGES.registerLink}</Link>
                )}
            </p>
        </form>
    )
}

export default LoginForm
