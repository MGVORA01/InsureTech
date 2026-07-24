import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate, type Location } from "react-router-dom";
import Button from "../../components/Button";
import Input from "../../components/Input";
import { AUTH_MESSAGES } from "./auth.constants";
import type { RegisterFormData } from "./auth.types";
import PasswordInput from "./PasswordInput";
import PasswordRequirements from "./PasswordRequirements";
import { useAuth } from "../../hooks/useAuth";
import { registerSchema } from "./validation/register.schema";

interface RegisterFormProps {
  onLogin?: () => void;
}

function RegisterForm({ onLogin }: RegisterFormProps) {
  const { error, loading, register: registerAccount } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    watch,
  } = useForm<RegisterFormData>({
    defaultValues: {
      fullName: "",
      email: "",
      phoneNo: "",
      password: "",
      confirmPassword: "",
    },
    resolver: zodResolver(registerSchema),
  });

  const passwordValue = watch("password");

  const navigate = useNavigate();
  const location = useLocation();

  const onSubmit = async (data: RegisterFormData) => {
    setSuccessMessage(null);

    try {
      const response = await registerAccount(data);
      const verificationToken = response?.verification_token;
      if (verificationToken) {
        sessionStorage.setItem("verify_email_token", verificationToken);
        sessionStorage.setItem("verify_email_address", data.email);

        const backgroundLocation =
          (location.state as { backgroundLocation?: Location } | null)
            ?.backgroundLocation ?? location;

        navigate("/verify-email", {
          state: { backgroundLocation },
        });
        return;
      }

      setSuccessMessage("Registered successfully. Now login.");
      reset();
    } catch {
      // Auth errors are stored in Redux by the async thunks.
    }
  };

  return (
    <form
      className="grid w-full max-w-[480px] justify-self-center gap-[22px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-card)] sm:p-8"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <header className="grid gap-2">
        <h2 className="m-0 text-[1.85rem] leading-[1.15] text-[var(--color-primary)]">
          {AUTH_MESSAGES.registerTitle}
        </h2>
        <p className="m-0 leading-[1.55] text-[var(--color-text-secondary)]">
          {AUTH_MESSAGES.registerSubtitle}
        </p>
      </header>

      <div className="grid gap-4">
        <Input
          autoComplete="name"
          error={errors.fullName?.message}
          label="Full Name"
          placeholder="Alex Morgan"
          type="text"
          {...register("fullName")}
        />

        <Input
          autoComplete="email"
          error={errors.email?.message}
          label="Email"
          placeholder="name@company.com"
          type="email"
          {...register("email")}
        />

        <Input
          autoComplete="tel"
          error={errors.phoneNo?.message}
          label="Phone Number"
          placeholder="9876543210"
          type="tel"
          {...register("phoneNo")}
        />

        <PasswordInput
          autoComplete="new-password"
          error={errors.password?.message}
          label="Password"
          placeholder="Create a strong password"
          {...register("password")}
        />
        <PasswordRequirements password={passwordValue} />

        <PasswordInput
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          label="Confirm Password"
          placeholder="Repeat your password"
          {...register("confirmPassword")}
        />
      </div>

      {error ? (
        <p
          className="m-0 rounded-[var(--radius-md)] bg-[var(--color-risk-high-bg)] p-3 text-sm font-bold text-[var(--color-risk-high)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {successMessage ? (
        <p
          className="m-0 rounded-[var(--radius-md)] bg-[var(--color-risk-low-bg)] p-3 text-sm font-bold text-[var(--color-risk-low)]"
          role="status"
        >
          {successMessage}
        </p>
      ) : null}

      <Button disabled={loading} fullWidth type="submit">
        {loading ? "Registering..." : AUTH_MESSAGES.registerButton}
      </Button>

      <p className="m-0 text-center leading-[1.55] text-[var(--color-text-secondary)]">
        {AUTH_MESSAGES.hasAccount}{" "}
        {onLogin ? (
          <button
            className="border-0 bg-transparent p-0 font-extrabold text-[var(--color-secondary)] hover:text-[var(--color-secondary-dark)] hover:underline"
            onClick={onLogin}
            type="button"
          >
            {AUTH_MESSAGES.loginLink}
          </button>
        ) : (
          <Link
            className="font-extrabold text-[var(--color-secondary)] hover:text-[var(--color-secondary-dark)] hover:underline"
            to="/login"
          >
            {AUTH_MESSAGES.loginLink}
          </Link>
        )}
      </p>
    </form>
  );
}

export default RegisterForm;
