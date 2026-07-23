import { useEffect, useRef, useState } from "react";
import axios from "axios";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import BuildRoundedIcon from "@mui/icons-material/BuildRounded";
import { authApi } from "../features/auth/authApi";

const AUTO_RETRY_SECONDS = 8;
const RESTORE_DELAY_MS = 900;

type Phase = "checking" | "reconnecting" | "restoring";

const PHASE_META: Record<Phase, { label: string; color: string }> = {
  checking: { label: "Checking connection", color: "var(--color-secondary)" },
  reconnecting: { label: "Reconnecting to servers", color: "var(--color-cta)" },
  restoring: {
    label: "Restoring your session",
    color: "var(--color-risk-low)",
  },
};

export default function MaintenancePage() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [countdown, setCountdown] = useState(AUTO_RETRY_SECONDS);
  const [attempts, setAttempts] = useState(0);
  const mounted = useRef(true);
  const busy = phase !== "checking";

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function pingServer() {
    setPhase("reconnecting");
    try {
      await authApi.me();
      if (mounted.current) {
        setPhase("restoring");
        await new Promise((resolve) => setTimeout(resolve, RESTORE_DELAY_MS));
        if (mounted.current) window.location.reload();
      }
      return;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (mounted.current) {
          setPhase("restoring");
          await new Promise((resolve) => setTimeout(resolve, RESTORE_DELAY_MS));
          if (mounted.current) window.location.reload();
        }
        return;
      }
    }
    if (mounted.current) {
      setAttempts((n) => n + 1);
      setCountdown(AUTO_RETRY_SECONDS);
      setPhase("checking");
    }
  }

  useEffect(() => {
    if (busy) return;

    if (countdown <= 0) {
      const holdAtFull = setTimeout(() => {
        pingServer();
      }, 700);
      return () => clearTimeout(holdAtFull);
    }

    const tick = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, countdown]);

  const checkingProgress =
    ((AUTO_RETRY_SECONDS - countdown) / AUTO_RETRY_SECONDS) * 100;
  const meta = PHASE_META[phase];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-[0.16] blur-3xl"
        style={{ backgroundColor: "var(--color-secondary)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full opacity-[0.14] blur-3xl"
        style={{ backgroundColor: "var(--color-cta)" }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(var(--color-border) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 60% 50% at 50% 40%, black 10%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 50% at 50% 40%, black 10%, transparent 70%)",
        }}
      />

      <div className="relative flex w-full max-w-lg flex-col items-center">
        <div className="mb-7 flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-[7px]"
            style={{ backgroundColor: "var(--color-secondary)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L3 6V11C3 16.5 6.8 20.7 12 22C17.2 20.7 21 16.5 21 11V6L12 2Z"
                stroke="white"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M9 12L11 14L15.5 9.5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-[17px] font-bold tracking-tight text-text-primary">
            InsureTech
          </span>
        </div>

        <div className="w-full rounded-[var(--radius-xl)] border border-border bg-surface p-8 text-center shadow-lg sm:p-10">
          <div className="relative mx-auto flex h-[76px] w-[76px] items-center justify-center">
            <span
              className="absolute inset-0 rounded-full transition-colors duration-500"
              style={{
                backgroundColor: "var(--color-selected)",
                animation: "maint-ping 2.2s cubic-bezier(0,0,0.2,1) infinite",
              }}
            />
            <span
              className="relative flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--color-selected)" }}
            >
              <BuildRoundedIcon
                style={{
                  color: meta.color,
                  fontSize: 28,
                  transition: "color 300ms",
                }}
              />
            </span>
          </div>

          <p className="mt-6 text-[12px] font-bold uppercase tracking-[0.16em] text-secondary">
            Scheduled maintenance
          </p>
          <h1 className="mt-2 text-[27px] font-extrabold leading-[1.15] tracking-tight text-text-primary sm:text-[30px]">
            We&rsquo;ll be right back
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-[14.5px] leading-6 text-text-secondary">
            InsureTech is currently undergoing scheduled maintenance to improve
            your experience. This won&rsquo;t take long &mdash; thanks for your
            patience. This page will refresh itself automatically the moment
            we&rsquo;re back.
          </p>

          <div className="mx-auto mt-8 w-full max-w-sm text-left">
            <div className="mb-2 flex items-center justify-between">
              <span
                className="inline-flex items-center gap-1.5 text-[12.5px] font-bold"
                style={{ color: meta.color }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: meta.color,
                    ...(phase !== "checking"
                      ? { animation: "maint-pulse 1s ease-in-out infinite" }
                      : {}),
                  }}
                />
                {meta.label}
              </span>
              {phase === "checking" && (
                <span className="text-[11px] font-semibold text-text-tertiary">
                  {AUTO_RETRY_SECONDS - countdown}s elapsed &middot;{" "}
                  {Math.round(checkingProgress)}%
                </span>
              )}
              {phase === "reconnecting" && (
                <span className="text-[11px] font-semibold text-text-tertiary">
                  In progress&hellip;
                </span>
              )}
              {phase === "restoring" && (
                <span
                  className="text-[11px] font-semibold"
                  style={{ color: meta.color }}
                >
                  Done
                </span>
              )}
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
              {phase === "checking" && (
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{
                    width: `${checkingProgress}%`,
                    backgroundColor: meta.color,
                  }}
                />
              )}
              {phase === "reconnecting" && (
                <div className="relative h-full w-full">
                  <div
                    className="absolute inset-y-0 w-1/3 rounded-full"
                    style={{
                      backgroundColor: meta.color,
                      animation: "maint-sweep 1.1s ease-in-out infinite",
                    }}
                  />
                </div>
              )}
              {phase === "restoring" && (
                <div
                  className="h-full w-full rounded-full transition-all duration-500"
                  style={{ backgroundColor: meta.color }}
                />
              )}
            </div>

            <div className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-[0.04em] transition-colors">
              <span
                style={{
                  color:
                    phase === "checking"
                      ? PHASE_META.checking.color
                      : "var(--color-text-tertiary)",
                }}
              >
                Checking
              </span>
              <span
                style={{
                  color:
                    phase === "reconnecting"
                      ? PHASE_META.reconnecting.color
                      : "var(--color-text-tertiary)",
                }}
              >
                Reconnecting
              </span>
              <span
                style={{
                  color:
                    phase === "restoring"
                      ? PHASE_META.restoring.color
                      : "var(--color-text-tertiary)",
                }}
              >
                Restoring
              </span>
            </div>
          </div>

          <style>{`
            @keyframes maint-ping {
              0% { transform: scale(1); opacity: 0.6; }
              75%, 100% { transform: scale(1.9); opacity: 0; }
            }
            @keyframes maint-sweep {
              0% { left: -34%; }
              100% { left: 100%; }
            }
            @keyframes maint-pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.4; transform: scale(1.4); }
            }
          `}</style>

          <button
            type="button"
            onClick={pingServer}
            disabled={busy}
            className="mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-secondary text-[15px] font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshRoundedIcon
              className={`h-[18px] w-[18px] ${busy ? "animate-spin" : ""}`}
            />
            {phase === "reconnecting"
              ? "Checking…"
              : phase === "restoring"
                ? "Almost there…"
                : "Check now"}
          </button>

          {attempts > 2 && phase === "checking" && (
            <p className="mt-5 border-t border-border pt-4 text-[12px] leading-5 text-text-tertiary">
              Maintenance taking longer than expected? Please check back again
              shortly.
            </p>
          )}
        </div>

        <p className="mt-6 text-[12px] text-text-tertiary">
          &copy; {new Date().getFullYear()} InsureTech. All rights reserved.
        </p>
      </div>
    </div>
  );
}
