import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BalanceRoundedIcon from "@mui/icons-material/BalanceRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import {
  generateRecommendations,
  getRecommendations,
  getRecommendationPolicyDownload,
} from "../features/recommendations/recommendationsApi";
import { downloadRecommendationReportPdf } from "../features/recommendations/recommendationReportPdf";
import { profileApi } from "../features/profile/profileApi";
import type {
  RecommendationListOut,
  RecommendationOut,
  RiskScoreOut,
} from "../features/recommendations/recommendations.types";
import UserLayout from "../layouts/UserLayout";
import type { Section } from "../components/UserSidebar";

type Status = "loading" | "empty" | "error" | "ready";
type ApiError = { response?: { data?: { error?: string } }; message?: string };

const LEVEL_STYLES: Record<
  string,
  { label: string; color: string; background: string }
> = {
  critical: {
    label: "Critical",
    color: "var(--color-risk-critical)",
    background: "var(--color-risk-critical-bg)",
  },
  high: {
    label: "High",
    color: "var(--color-risk-high)",
    background: "var(--color-risk-high-bg)",
  },
  medium: {
    label: "Medium",
    color: "var(--color-risk-medium)",
    background: "var(--color-risk-medium-bg)",
  },
  low: {
    label: "Low",
    color: "var(--color-risk-low)",
    background: "var(--color-risk-low-bg)",
  },
};

function levelStyle(level?: string) {
  return LEVEL_STYLES[level || "low"] ?? LEVEL_STYLES.low;
}

function clampPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return 0;
  return Math.round(Math.min(Math.max(value, 0), 100));
}

function riskScorePercent(score: number | null | undefined) {
  if (score === null || score === undefined) return 0;
  return clampPercent(score <= 1 ? score * 100 : score);
}

function scorePercent(rec: RecommendationOut) {
  return clampPercent(
    rec.recommendation_score ?? riskScorePercent(rec.risk_score),
  );
}

function highestRisks(scores: RiskScoreOut[]) {
  return [...scores].sort((a, b) => b.score - a.score).slice(0, 3);
}

function getApiErrorMessage(err: unknown, fallback: string) {
  const apiError = err as ApiError;
  return apiError?.response?.data?.error || apiError?.message || fallback;
}

function LoadingView() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "var(--color-background)" }}
    >
      <div
        className="flex items-center gap-3 rounded-xl border px-6 py-5 shadow-sm"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Preparing advisor recommendations…
        </span>
      </div>
    </div>
  );
}

function ScoreRing({ matched, total }: { matched: number; total: number }) {
  const pct = total > 0 ? clampPercent((matched / total) * 100) : 0;
  const size = 76;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="white"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-lg font-bold leading-none text-white">
          {matched}/{total}
        </span>
        <span className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-300">
          Risks
        </span>
      </div>
    </div>
  );
}

function SelectionControl({
  selected,
  disabled,
  onToggle,
}: {
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`flex select-none flex-col items-center gap-2 rounded-xl border px-3 py-3 text-center transition ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:border-primary/50"
      }`}
      style={{
        borderColor: selected
          ? "var(--color-primary-dark)"
          : "var(--color-border)",
        background: selected ? "var(--color-selected)" : "var(--color-surface)",
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={selected}
        disabled={disabled}
        onChange={onToggle}
        className="h-5 w-5 cursor-pointer accent-current"
        style={{ accentColor: "var(--color-primary-dark)" }}
      />
      <span
        className="text-[10px] font-bold uppercase leading-tight tracking-wide"
        style={{
          color: selected
            ? "var(--color-primary-dark)"
            : "var(--color-text-secondary)",
        }}
      >
        {selected ? "Selected" : "Compare"}
      </span>
    </label>
  );
}

function RecommendationCard({
  recommendation,
  rank,
  sessionId,
  selected,
  selectionDisabled,
  onToggleSelect,
}: {
  recommendation: RecommendationOut;
  rank: number;
  sessionId: string;
  selected: boolean;
  selectionDisabled: boolean;
  onToggleSelect: () => void;
}) {
  const policy = recommendation.policies[0];
  const policyId = recommendation.policy_id ?? policy?.id ?? null;
  const match = scorePercent(recommendation);
  const riskPercent = riskScorePercent(recommendation.risk_score);
  const badge =
    rank === 1
      ? "Best Match"
      : match >= 85
        ? "High Coverage"
        : "Recommended for You";
  const coverageCount = recommendation.coverage_match_count;
  const coverageTotal = recommendation.coverage_match_total;
  const [downloadError, setDownloadError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloadError("");
    if (!policyId) {
      setDownloadError("Policy PDF is not available for download.");
      return;
    }
    setDownloading(true);
    try {
      const download = await getRecommendationPolicyDownload(
        sessionId,
        policyId,
      );
      const link = document.createElement("a");
      link.href = download.download_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = download.file_name;
      link.click();
    } catch (err: unknown) {
      setDownloadError(
        getApiErrorMessage(err, "Policy PDF is not available for download."),
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <article
      className="flex overflow-hidden rounded-2xl border shadow-card transition-shadow hover:shadow-lg"
      style={{
        background: "var(--color-surface)",
        borderColor: selected
          ? "var(--color-primary-dark)"
          : "var(--color-border)",
        boxShadow: selected ? "0 0 0 2px var(--color-primary-dark)" : undefined,
      }}
    >
      {/* Selection rail */}
      <div
        className="flex w-20 shrink-0 flex-col items-center justify-start gap-4 border-r px-2 py-5 sm:w-24"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface-alt)",
        }}
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
          style={{ background: "var(--color-primary-dark)", color: "white" }}
        >
          #{rank}
        </div>
        <SelectionControl
          selected={selected}
          disabled={selectionDisabled}
          onToggle={onToggleSelect}
        />
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className="px-5 py-4 text-white sm:px-6"
          style={{ background: "var(--color-primary-dark)" }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
                  style={{
                    background: "var(--color-risk-medium-bg)",
                    color: "var(--color-risk-medium)",
                  }}
                >
                  <WorkspacePremiumRoundedIcon sx={{ fontSize: 16 }} />
                  {badge}
                </span>
              </div>
              <h3 className="mt-3 truncate text-xl font-bold leading-7">
                {recommendation.policy_name || policy?.policy_name}
              </h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-300">
                <VerifiedRoundedIcon sx={{ fontSize: 16 }} />
                {recommendation.company_name || policy?.insurer_name}
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-300">
                Risk score: {riskPercent}%
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 self-start lg:flex-col lg:self-center">
              <ScoreRing matched={coverageCount} total={coverageTotal} />
              <p className="text-xs font-bold text-slate-300 lg:text-center">
                Covered {coverageCount} / {coverageTotal} risks
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-5 sm:p-6">
          <div>
            <h4
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Why this policy is recommended
            </h4>
            <p
              className="mt-2 text-sm leading-6"
              style={{ color: "var(--color-text-primary)" }}
            >
              {recommendation.why_recommended ||
                "This policy is ranked from your risk profile and supporting policy wording."}
            </p>
          </div>

          <div>
            <h4
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Risk categories covered
            </h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {recommendation.matched_risk_categories.length > 0 ? (
                recommendation.matched_risk_categories.map((risk) => (
                  <span
                    key={risk}
                    className="rounded-full px-3 py-1.5 text-xs font-bold"
                    style={{
                      background: "var(--color-selected)",
                      color: "var(--color-secondary)",
                    }}
                  >
                    {risk}
                  </span>
                ))
              ) : (
                <span
                  className="text-sm"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  No assessed business risks covered.
                </span>
              )}
            </div>
          </div>

          {recommendation.additional_inclusions.length > 0 && (
            <div>
              <h4
                className="text-xs font-bold uppercase tracking-wide"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Additional inclusions
              </h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {recommendation.additional_inclusions.map((item) => (
                  <span
                    key={item}
                    className="rounded-full px-3 py-1.5 text-xs font-bold"
                    style={{
                      background: "var(--color-surface-alt)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div
            className="flex flex-col items-end gap-2 border-t pt-4"
            style={{ borderColor: "var(--color-border)" }}
          >
            <button
              onClick={handleDownload}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-md px-5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "var(--color-primary-dark)" }}
              type="button"
              disabled={downloading}
            >
              {downloading ? "Preparing…" : "Download policy PDF"}
            </button>
            {downloadError && (
              <p className="text-right text-sm font-medium text-red-600">
                {downloadError}
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function RecommendationsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<RecommendationListOut | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedPolicyIds, setSelectedPolicyIds] = useState<string[]>([]);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");

  const loadRecommendations = useCallback(async () => {
    if (!sessionId) {
      setStatus("error");
      setErrorMsg("No session ID provided.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      // First try to fetch existing recommendations for this session. This
      // avoids regenerating recommendations (which may soft-deactivate
      // previously stored results) when users navigate between pages.
      let result = null;
      try {
        console.debug("[RecommendationsPage] attempting GET /recommendations", {
          sessionId,
        });
        result = await getRecommendations(sessionId);
        console.debug("[RecommendationsPage] GET result", {
          sessionId,
          count: result?.recommendations?.length ?? 0,
        });
      } catch (getErr) {
        console.debug("[RecommendationsPage] GET failed, will generate", {
          sessionId,
          error: getErr,
        });
        result = null;
      }

      // If there are no stored recommendations, generate them.
      if (
        !result ||
        !Array.isArray(result.recommendations) ||
        result.recommendations.length === 0
      ) {
        try {
          console.debug(
            "[RecommendationsPage] calling POST /recommendations/generate",
            { sessionId },
          );
          result = await generateRecommendations(sessionId);
          console.debug("[RecommendationsPage] POST generate result", {
            sessionId,
            count: result?.recommendations?.length ?? 0,
          });
        } catch (genErr) {
          const apiError = genErr as ApiError;
          setStatus("error");
          setErrorMsg(
            apiError?.response?.data?.error ||
              apiError?.message ||
              "Failed to load recommendations.",
          );
          return;
        }
      }

      setData({
        ...result,
        recommendations: result.recommendations.slice(0, 5),
      });
      setSelectedPolicyIds([]);
      setPdfError("");
      setStatus(result.recommendations.length === 0 ? "empty" : "ready");
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setStatus("error");
      setErrorMsg(
        apiError?.response?.data?.error ||
          apiError?.message ||
          "Failed to load recommendations.",
      );
    }
  }, [sessionId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRecommendations();
  }, [loadRecommendations]);

  const topRisks = useMemo(
    () => highestRisks(data?.scores ?? []),
    [data?.scores],
  );
  const topRecommendations = useMemo(
    () => data?.recommendations.slice(0, 5) ?? [],
    [data?.recommendations],
  );
  const selectedCount = selectedPolicyIds.length;

  useEffect(() => {
    if (!sessionId || selectedPolicyIds.length !== 2) return;
    navigate(`/recommendations/${sessionId}/compare`, {
      state: {
        selectedPolicyIds,
        recommendations: topRecommendations,
        businessProfileId: data?.business_profile_id ?? null,
      },
    });
  }, [
    data?.business_profile_id,
    navigate,
    selectedPolicyIds,
    sessionId,
    topRecommendations,
  ]);

  const handleTogglePolicy = (policyId: string | null) => {
    if (!policyId) return;
    setSelectedPolicyIds((current) => {
      if (current.includes(policyId)) {
        return current.filter((id) => id !== policyId);
      }
      if (current.length >= 2) {
        return current;
      }
      return [...current, policyId];
    });
  };

  const handleDownloadReport = async () => {
    if (!data || status !== "ready" || pdfBusy) return;
    setPdfBusy(true);
    setPdfError("");
    try {
      const business = data.business_profile_id
        ? await profileApi
            .getBusinessById(data.business_profile_id)
            .catch(() => null)
        : null;
      await downloadRecommendationReportPdf(data, business);
    } catch (err) {
      setPdfError(
        getApiErrorMessage(
          err,
          "Unable to generate the PDF report. Please try again.",
        ),
      );
    } finally {
      setPdfBusy(false);
    }
  };

  const handleSectionChange = (section: Section) => {
    if (section === "profile") {
      navigate("/dashboard");
      return;
    }
    if (section === "profiling" || section === "feedback") {
      navigate(`/dashboard/${section}`);
      return;
    }
    if (section === "comparison") {
      navigate(
        sessionId
          ? `/recommendations/${sessionId}/compare`
          : "/dashboard/comparison",
      );
      return;
    }
    if (section === "chatbot") {
      if (sessionId) {
        navigate(`/recommendations/${sessionId}/compare`, {
          state: {
            recommendations: topRecommendations,
            businessProfileId: data?.business_profile_id ?? null,
            selectedPolicyIds,
            openChat: true,
          },
        });
      } else {
        navigate("/dashboard/comparison");
      }
    }
  };

  if (status === "loading") {
    return (
      <UserLayout
        activeSection="recommendation"
        onSectionChange={handleSectionChange}
        contentClassName="w-full"
      >
        <LoadingView />
      </UserLayout>
    );
  }

  if (status === "error") {
    return (
      <UserLayout
        activeSection="recommendation"
        onSectionChange={handleSectionChange}
        contentClassName="w-full"
      >
        <div
          className="flex min-h-screen items-center justify-center p-6"
          style={{ background: "var(--color-background)" }}
        >
          <div
            className="w-full max-w-md rounded-xl border p-8 text-center shadow-sm"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-risk-high-bg)",
            }}
          >
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
              style={{
                background: "var(--color-risk-high-bg)",
                color: "var(--color-risk-high)",
              }}
            >
              <ErrorOutlineRoundedIcon />
            </div>
            <h2
              className="mt-4 text-xl font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Recommendations unavailable
            </h2>
            <p
              className="mt-2 text-sm leading-6"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {errorMsg}
            </p>
            <button
              onClick={loadRecommendations}
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-bold text-white transition hover:opacity-90"
              style={{ background: "var(--color-primary-dark)" }}
            >
              <RefreshRoundedIcon className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout
      activeSection="recommendation"
      onSectionChange={handleSectionChange}
      contentClassName="w-full"
    >
      <main
        className="min-h-screen pb-24"
        style={{ background: "var(--color-background)" }}
      >
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <section
            className="rounded-xl border p-5 shadow-sm sm:p-6"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
                  style={{ background: "var(--color-primary-dark)" }}
                >
                  <ShieldOutlinedIcon />
                </div>
                <div>
                  <h1
                    className="text-2xl font-bold tracking-normal sm:text-3xl"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    AI Policy Recommendations
                  </h1>
                  <p
                    className="mt-1 text-sm leading-6"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Top 5 advisor-ranked policies based on your risk assessment
                    and policy wording evidence.
                  </p>
                </div>
              </div>
              <div
                className="flex items-center gap-3 rounded-lg border px-4 py-2.5"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-surface-alt)",
                }}
              >
                <BalanceRoundedIcon
                  className="h-4 w-4"
                  style={{ color: "var(--color-text-secondary)" }}
                />
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {selectedCount === 0 && "Check two policies to compare"}
                  {selectedCount === 1 &&
                    "1 selected — pick one more to compare"}
                  {selectedCount === 2 && "Opening comparison…"}
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {topRisks.map((risk, index) => {
                const style = levelStyle(risk.risk_level);
                return (
                  <div
                    key={risk.risk_category_name}
                    className="rounded-xl border p-4"
                    style={{
                      background: style.background,
                      borderColor: style.color,
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="text-xs font-bold uppercase tracking-wide"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        Priority risk #{index + 1}
                      </span>
                      <span
                        className="text-sm font-bold"
                        style={{ color: style.color }}
                      >
                        {riskScorePercent(risk.score)}%
                      </span>
                    </div>
                    <p
                      className="mt-2 text-sm font-bold"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {risk.risk_category_name}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {status === "empty" ? (
            <section
              className="mt-6 rounded-xl border p-8 text-center shadow-sm"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-risk-low-bg)",
              }}
            >
              <CheckCircleOutlineRoundedIcon
                className="mx-auto h-10 w-10"
                style={{ color: "var(--color-risk-low)" }}
              />
              <h2
                className="mt-4 text-xl font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                No urgent policy match required
              </h2>
              <p
                className="mx-auto mt-2 max-w-xl text-sm leading-6"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Your latest assessment did not produce enough high-priority risk
                evidence for policy recommendations.
              </p>
            </section>
          ) : (
            <section className="mt-8">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <InsightsOutlinedIcon
                    className="h-5 w-5"
                    style={{ color: "var(--color-text-primary)" }}
                  />
                  <h2
                    className="text-lg font-bold"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    Top Recommended Insurance Policies
                  </h2>
                </div>
                <button
                  onClick={handleDownloadReport}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ background: "var(--color-primary-dark)" }}
                  type="button"
                  disabled={pdfBusy}
                >
                  <PictureAsPdfRoundedIcon className="h-4 w-4" />
                  {pdfBusy ? "Preparing PDF…" : "Download PDF report"}
                </button>
              </div>
              {pdfError && (
                <p className="mb-4 text-right text-sm font-medium text-red-600">
                  {pdfError}
                </p>
              )}
              <div className="space-y-6">
                {topRecommendations.map((recommendation, index) => (
                  <RecommendationCard
                    key={
                      recommendation.policy_id ||
                      `${recommendation.policy_name}-${index}`
                    }
                    recommendation={recommendation}
                    rank={index + 1}
                    sessionId={sessionId ?? ""}
                    selected={Boolean(
                      recommendation.policy_id &&
                      selectedPolicyIds.includes(recommendation.policy_id),
                    )}
                    selectionDisabled={
                      selectedPolicyIds.length >= 2 &&
                      !(
                        recommendation.policy_id &&
                        selectedPolicyIds.includes(recommendation.policy_id)
                      )
                    }
                    onToggleSelect={() =>
                      handleTogglePolicy(recommendation.policy_id)
                    }
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sticky compare bar */}
        {status === "ready" && selectedCount > 0 && (
          <div
            className="fixed inset-x-0 bottom-0 z-20 border-t px-4 py-3 shadow-lg sm:px-6"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--color-text-primary)" }}
              >
                {selectedCount === 1
                  ? "1 policy selected — choose 1 more to compare"
                  : "2 policies selected"}
              </span>
              <button
                onClick={() => setSelectedPolicyIds([])}
                className="text-sm font-bold underline"
                style={{ color: "var(--color-text-secondary)" }}
                type="button"
              >
                Clear selection
              </button>
            </div>
          </div>
        )}
      </main>
    </UserLayout>
  );
}
