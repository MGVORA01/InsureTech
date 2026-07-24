import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";
import { authApi, getAuthErrorMessage } from "../features/auth/authApi";
import { AUTH_MESSAGES } from "../features/auth/auth.constants";
import Button from "../components/Button";

type PageState = "form" | "submitting" | "success" | "invalid";

// Stages of the "correct OTP" reveal sequence, played after the API call
// succeeds and before we switch pageState to "success":
//   idle       -> normal form
//   converging -> boxes shrink + slide toward center and fade out
//   circle     -> a blue circle blooms where the boxes were, then holds
//   checked    -> circle turns green, checkmark draws, text/confetti show
type SuccessStage = "idle" | "converging" | "circle" | "checked";

interface VerifyEmailPageProps {
  inline?: boolean;
  onClose?: () => void;
}

const OTP_LENGTH = 4;

// Horizontal distance (px) each box needs to travel to reach the group's
// center, precomputed for 4 boxes at h-14 w-14 (56px) with gap-3 (12px).
const OTP_CONVERGE_DX = [102, 34, -34, -102];

// Timing for the success reveal. Slowed down from the original fast pass
// (220/260ms) so each stage is clearly perceivable rather than a blur:
//   converge (boxes shrink away) -> circle (bloom in + brief hold) -> checked
const CONVERGE_MS = 450;
const CIRCLE_MS = 550;
const HOLD_MS = 200; // pause after the circle has fully bloomed, before it flips green

function VerifyEmailPage({ inline = false, onClose }: VerifyEmailPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const backgroundLocation =
    (location.state as { backgroundLocation?: Location } | null)
      ?.backgroundLocation;

  const [pageState, setPageState] = useState<PageState>("form");
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(
    null,
  );
  const [email, setEmail] = useState<string | null>(null);

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState<string | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [pulseIndex, setPulseIndex] = useState<number | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [successStage, setSuccessStage] = useState<SuccessStage>("idle");

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearQueuedTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };
  useEffect(() => () => clearQueuedTimers(), []);

  useEffect(() => {
    const token = sessionStorage.getItem("verify_email_token");
    const savedEmail = sessionStorage.getItem("verify_email_address");

    if (!token) {
      setPageState("invalid");
      return;
    }

    setVerificationToken(token);
    setEmail(savedEmail);
  }, []);

  useEffect(() => {
    if (pageState === "form") {
      inputRefs.current[0]?.focus();
    }
  }, [pageState]);

  const navigateToLogin = () => {
    const state = backgroundLocation ? { backgroundLocation } : undefined;
    navigate("/login", { state, replace: true });
  };

  const handleDigitChange = (index: number, rawValue: string) => {
    const value = rawValue.replace(/[^0-9]/g, "");

    if (value.length > 1) {
      const pasted = value.slice(0, OTP_LENGTH).split("");
      const next = Array(OTP_LENGTH).fill("");
      pasted.forEach((digit, i) => {
        next[i] = digit;
      });
      setOtp(next);
      const lastFilled = Math.min(pasted.length, OTP_LENGTH) - 1;
      inputRefs.current[Math.max(lastFilled, 0)]?.focus();
      setPulseIndex(Math.max(lastFilled, 0));
      return;
    }

    setOtp((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });

    if (otpError) setOtpError(null);
    if (error) setError(null);

    if (value) {
      setPulseIndex(index);
      if (index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const validateOtp = (code: string) => {
    if (code.length !== OTP_LENGTH || !/^[0-9]{4}$/.test(code)) {
      return "OTP must be 4 digits";
    }
    return null;
  };

  const triggerWrongOtpAnimation = () => {
    setOtp(Array(OTP_LENGTH).fill(""));
    setIsShaking(true);
    inputRefs.current[0]?.focus();
  };

  // Plays the converge -> circle (bloom + hold) -> checked sequence, then
  // commits to the permanent "success" pageState once it's fully played out.
  const runSuccessSequence = () => {
    clearQueuedTimers();
    setSuccessStage("converging");

    const toCircle = setTimeout(() => {
      setSuccessStage("circle");
    }, CONVERGE_MS);

    const toChecked = setTimeout(() => {
      setSuccessStage("checked");
      setPageState("success");
      sessionStorage.removeItem("verify_email_token");
      sessionStorage.removeItem("verify_email_address");
    }, CONVERGE_MS + CIRCLE_MS + HOLD_MS);

    timersRef.current.push(toCircle, toChecked);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    const validationError = validateOtp(code);
    if (validationError) {
      setOtpError(validationError);
      triggerWrongOtpAnimation();
      return;
    }
    setOtpError(null);

    if (!verificationToken) {
      setError("Verification token is missing. Please register again.");
      setPageState("invalid");
      return;
    }

    setPageState("submitting");
    setError(null);
    try {
      await authApi.verifyEmail({
        token: verificationToken,
        otp: code,
      });
      runSuccessSequence();
    } catch (err) {
      const message = getAuthErrorMessage(err);
      setError(message);
      setPageState("form");
      triggerWrongOtpAnimation();
    }
  };

  const handleResend = async () => {
    if (!verificationToken) {
      setError("Verification token is missing. Please register again.");
      setPageState("invalid");
      return;
    }

    setError(null);
    setInfoMessage(null);
    setOtp(Array(OTP_LENGTH).fill(""));
    clearQueuedTimers();
    setSuccessStage("idle");
    try {
      const response = await authApi.resendOtp({ token: verificationToken });
      if (response?.verification_token) {
        sessionStorage.setItem(
          "verify_email_token",
          response.verification_token,
        );
        setVerificationToken(response.verification_token);
      }
      setInfoMessage(
        "A new code has been sent to your email. Please enter it.",
      );
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }

    if (backgroundLocation) {
      navigate(backgroundLocation.pathname + backgroundLocation.search, {
        replace: true,
      });
      return;
    }

    navigate("/");
  };

  const showCircleTransition =
    pageState === "submitting" &&
    (successStage === "circle" || successStage === "checked");
  const isConverging = successStage === "converging";
  const isCircleGreen = successStage === "checked";

  const content = (
    <div className="relative w-full max-w-md overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-card)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-400/30 to-purple-400/30 blur-2xl animate-blob-float-slow"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-gradient-to-tr from-blue-400/25 to-cyan-300/25 blur-2xl animate-blob-float-slow-reverse"
      />

      <div className="relative">
        {pageState === "invalid" ? (
          <div className="animate-fade-in-up">
            <h2 className="text-[1.85rem] font-bold text-[var(--color-primary)]">
              Invalid verification
            </h2>
            <p className="mt-3 text-[var(--color-text-secondary)]">
              We could not find a valid verification session. Please register
              again or contact support.
            </p>
            <Button
              className="mt-6"
              fullWidth
              type="button"
              onClick={() => navigate("/register")}
            >
              Go to Register
            </Button>
          </div>
        ) : pageState === "success" ? (
          <div className="relative animate-fade-in-up text-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-4 h-0 w-0"
            >
              {CONFETTI_PIECES.map((piece, i) => (
                <span
                  key={i}
                  className="absolute block h-2 w-2 rounded-sm animate-confetti-piece"
                  style={{
                    backgroundColor: piece.color,
                    animationDelay: `${piece.delay}ms`,
                    ["--tx" as string]: `${piece.x}px`,
                    ["--rot" as string]: `${piece.rotate}deg`,
                  }}
                />
              ))}
            </div>

            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 animate-pop-in">
              <svg
                className="h-9 w-9 text-emerald-500"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  className="animate-draw-check"
                  d="M5 13l4 4L19 7"
                  pathLength="1"
                />
              </svg>
            </div>
            <h2 className="text-[1.85rem] font-bold text-[var(--color-primary)]">
              Email verified
            </h2>
            <p className="mt-3 text-[var(--color-text-secondary)]">
              Your email has been verified. You can now log in.
            </p>
            <Button
              className="mt-6"
              fullWidth
              type="button"
              onClick={navigateToLogin}
            >
              Go to Login
            </Button>
          </div>
        ) : showCircleTransition ? (
          // Stage 2: the boxes have fully converged and vanished — a blue
          // circle blooms in and holds, then (isCircleGreen) flips green
          // right before the "success" pageState/checkmark takes over.
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping-slow ${
                  isCircleGreen ? "bg-emerald-400" : "bg-indigo-400"
                }`}
              />
              <span
                className={`relative flex h-16 w-16 items-center justify-center rounded-full shadow-lg animate-circle-grow transition-colors duration-300 ${
                  isCircleGreen
                    ? "bg-gradient-to-br from-emerald-500 to-emerald-400"
                    : "bg-gradient-to-br from-indigo-500 to-purple-500"
                }`}
              />
            </div>
          </div>
        ) : (
          <>
            <header
              className={`grid justify-items-center gap-2 text-center ${isConverging ? "animate-fade-out" : ""}`}
            >
              <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg animate-bounce-in">
                <svg
                  className="h-8 w-8 text-white animate-icon-pulse"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <rect height="14" rx="2" width="20" x="2" y="5" />
                  <path d="m22 7-10 6L2 7" />
                </svg>
              </div>

              <h2 className="m-0 text-[1.85rem] leading-[1.15] text-[var(--color-primary)] animate-fade-in-up">
                {AUTH_MESSAGES.verifyTitle}
              </h2>
              <p
                className="m-0 leading-[1.55] text-[var(--color-text-secondary)] animate-fade-in-up"
                style={{ animationDelay: "80ms" }}
              >
                {AUTH_MESSAGES.verifySubtitle}
              </p>
              {email ? (
                <p
                  className="m-0 text-sm text-[var(--color-text-secondary)] animate-fade-in-up"
                  style={{ animationDelay: "140ms" }}
                >
                  Code sent to <strong>{email}</strong>.
                </p>
              ) : null}
            </header>

            <form className="grid gap-4 mt-6" noValidate onSubmit={handleVerify}>
              <div
                className={`flex justify-center gap-3 ${isShaking ? "animate-shake" : ""}`}
                onAnimationEnd={(e) => {
                  if (e.animationName === "shake") setIsShaking(false);
                }}
              >
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    className={`h-14 w-14 rounded-2xl border-2 bg-white text-center text-2xl font-bold outline-none transition-all duration-150 animate-otp-pop-in focus:scale-105 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.15)] ${
                      isShaking || otpError
                        ? "border-[var(--color-risk-high)] text-[var(--color-risk-high)]"
                        : "border-[var(--color-border)] text-[var(--color-primary)] focus:border-indigo-500"
                    } ${pulseIndex === index ? "animate-otp-pulse" : ""} ${
                      isConverging ? "animate-converge" : ""
                    }`}
                    disabled={pageState === "submitting"}
                    inputMode="numeric"
                    maxLength={OTP_LENGTH}
                    style={{
                      animationDelay: isConverging
                        ? `${index * 40}ms`
                        : `${index * 90}ms`,
                      ["--dx" as string]: `${OTP_CONVERGE_DX[index]}px`,
                    }}
                    type="text"
                    value={digit}
                    onAnimationEnd={(e) => {
                      if (e.animationName === "otpPulse" && pulseIndex === index) {
                        setPulseIndex(null);
                      }
                    }}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                  />
                ))}
              </div>
              {otpError ? (
                <p className="text-center text-sm text-[var(--color-risk-high)] animate-fade-in-up">
                  {otpError}
                </p>
              ) : null}

              {error ? (
                <p
                  className="rounded-[var(--radius-md)] bg-[var(--color-risk-high-bg)] p-3 text-sm font-bold text-[var(--color-risk-high)] animate-fade-in-up"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              {infoMessage ? (
                <p
                  className="rounded-[var(--radius-md)] bg-[var(--color-risk-low-bg)] p-3 text-sm font-bold text-[var(--color-risk-low)] animate-fade-in-up"
                  role="status"
                >
                  {infoMessage}
                </p>
              ) : null}

              <div
                className={`grid gap-4 ${isConverging ? "animate-fade-out" : ""}`}
              >
                <Button
                  className="transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
                  disabled={pageState === "submitting"}
                  fullWidth
                  type="submit"
                >
                  {pageState === "submitting"
                    ? "Verifying..."
                    : AUTH_MESSAGES.verifyButton}
                </Button>

                <Button
                  disabled={pageState === "submitting"}
                  fullWidth
                  type="button"
                  variant="secondary"
                  onClick={handleResend}
                >
                  {AUTH_MESSAGES.resendOtp}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.45s ease-out both;
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .animate-fade-out {
          animation: fadeOut 0.3s ease-out forwards;
        }

        /* One-time entrance pop for each box when the form first mounts */
        @keyframes otpPopIn {
          0% { opacity: 0; transform: scale(0.4) translateY(12px); }
          60% { opacity: 1; transform: scale(1.08) translateY(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-otp-pop-in {
          animation: otpPopIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        /* Replayable pop that fires every time a digit is typed */
        @keyframes otpPulse {
          0% { transform: scale(1); }
          40% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
        .animate-otp-pulse {
          animation: otpPulse 0.22s ease-out;
        }

        /* Wrong-OTP shake, replayable via the isShaking state toggle */
        @keyframes shake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-6px); }
          40%, 60% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97);
        }

        /* Correct-OTP: boxes shrink + slide toward the group's center.
           Duration now matches CONVERGE_MS (450ms) so it reads as a
           deliberate motion instead of an instant snap. */
        @keyframes converge {
          0% { transform: translateX(0) scale(1); opacity: 1; }
          100% { transform: translateX(var(--dx)) scale(0.15); opacity: 0; }
        }
        .animate-converge {
          animation: converge 0.45s cubic-bezier(0.45, 0, 0.55, 1) forwards;
        }

        /* Blue circle blooming where the boxes converged to. Duration
           matches CIRCLE_MS (550ms): a slower bloom-in, a gentle overshoot,
           then it settles and holds (color flip is handled by the
           transition-colors class in JSX, not this keyframe). */
        @keyframes circleGrow {
          0% { transform: scale(0.3); opacity: 0; }
          65% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-circle-grow {
          animation: circleGrow 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        @keyframes pingSlow {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .animate-ping-slow {
          animation: pingSlow 1.2s ease-out infinite;
        }

        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.3); }
          50% { opacity: 1; transform: scale(1.1); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        .animate-bounce-in {
          animation: bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        @keyframes iconPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
        .animate-icon-pulse {
          animation: iconPulse 2s ease-in-out infinite;
          animation-delay: 0.6s;
        }

        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-pop-in {
          animation: popIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        @keyframes drawCheck {
          from { stroke-dashoffset: 1; }
          to { stroke-dashoffset: 0; }
        }
        .animate-draw-check {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: drawCheck 0.3s ease-out 0.1s forwards;
        }

        @keyframes blobFloatSlow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-14px, 16px) scale(1.08); }
        }
        .animate-blob-float-slow {
          animation: blobFloatSlow 7s ease-in-out infinite;
        }

        @keyframes blobFloatSlowReverse {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(14px, -16px) scale(1.1); }
        }
        .animate-blob-float-slow-reverse {
          animation: blobFloatSlowReverse 8s ease-in-out infinite;
        }

        @keyframes confettiPiece {
          0% { opacity: 1; transform: translate(0, 0) rotate(0deg); }
          100% { opacity: 0; transform: translate(var(--tx), 90px) rotate(var(--rot)); }
        }
        .animate-confetti-piece {
          animation: confettiPiece 0.9s ease-out both;
        }
      `}</style>
    </div>
  );

  if (!inline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        {content}
      </div>
    );
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[color:var(--overlay-primary-dark-55)] px-4 py-5 backdrop-blur-sm"
      role="dialog"
    >
      <div className="grid max-h-[calc(100vh-40px)] w-full max-w-[440px] grid-rows-[auto_minmax(0,1fr)] animate-fadeIn">
        <button
          aria-label="Close"
          className="mb-2 justify-self-end rounded-full border-0 bg-transparent p-2 text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
          onClick={handleClose}
          type="button"
        >
          <svg
            fill="none"
            height="22"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="22"
          >
            <line x1="18" x2="6" y1="6" y2="18" />
            <line x1="6" x2="18" y1="6" y2="18" />
          </svg>
        </button>

        {content}
      </div>
    </div>
  );
}

// Fixed set of confetti pieces (positions/colors/delays) so they don't
// re-randomize on every render — only computed once per module load.
const CONFETTI_COLORS = ["#4F46E5", "#7C3AED", "#F59E0B", "#22C55E", "#EC4899"];
const CONFETTI_PIECES = Array.from({ length: 18 }).map((_, i) => {
  const angle = (i / 18) * Math.PI * 2;
  const distance = 60 + Math.random() * 50;
  return {
    x: Math.cos(angle) * distance,
    rotate: Math.random() * 360,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 120,
  };
});

export default VerifyEmailPage;
