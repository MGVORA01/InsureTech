import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPolicies } from "../policies/policiesApi";
import { comparePolicies } from "./comparisonApi";
import type { PolicyListItem } from "../policies/policies.types";
import type { CompareRequest, CompareResponse } from "./comparison.types";
import ComparisonChatPopUp from "./ComparisonChatPopUp";
import { useNavigationLock } from "../../store/navigationLock";
import { loadComparisonState, saveComparisonState } from "./comparisonStorage";

interface ComparisonViewProps {
  businessProfileId: string;
  sessionId?: string;
  recommendedPolicies?: PolicyListItem[];
  initialPolicyA?: string;
  initialPolicyB?: string;
  autoCompare?: boolean;
  openChatSignal?: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  "What is Covered": "What is Covered",
  Coverage: "Coverage",
  Exclusions: "Exclusions",
  "Claims Process": "Claims Process",
  Conditions: "Conditions",
  coverage: "Coverage",
  exclusions: "Exclusions",
  claims: "Claims Process",
  financial: "Financials",
  conditions: "Terms & Conditions",
};

const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  "What is Covered": { icon: "🛡️", color: "text-emerald-600" },
  Coverage: { icon: "✅", color: "text-emerald-600" },
  Exclusions: { icon: "🚫", color: "text-red-500" },
  "Claims Process": { icon: "📋", color: "text-blue-500" },
  Conditions: { icon: "📜", color: "text-amber-600" },
};

const UNAVAILABLE_TEXT = "Information not available in the selected policies.";

function normalizeLegacyPoint(value: string): string {
  let cleaned = value.trim();
  cleaned = cleaned.replace(/^[\s•\-*▪▸►]+/g, "");
  cleaned = cleaned.replace(/^\s*(?:\(?\d+[.)]\s*)+(?:\(?[a-zA-Z]{1,3}[.)]\s*)*/i, "");
  cleaned = cleaned.replace(/^\s*\(?[a-zA-Z]{1,3}[.)]\s*/i, "");
  cleaned = cleaned.replace(/^\s*\(?[ivxIVX]+[.)]\s*/, "");
  cleaned = cleaned.replace(/[\s.]*(?:\.\.\.|…)+$/g, "").trim();
  return cleaned;
}

function toPointArray(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => normalizeLegacyPoint(String(item || "")))
      .filter(Boolean);
    return items.length > 0 ? items : [UNAVAILABLE_TEXT];
  }
  if (typeof value === "string" && value.trim()) {
    const parts = value
      .split(/\n+/)
      .map((part) => normalizeLegacyPoint(part))
      .filter(Boolean);
    return parts.length > 0 ? parts : [UNAVAILABLE_TEXT];
  }
  return [UNAVAILABLE_TEXT];
}

function PointList({ items }: { items: string[] | string | null | undefined }) {
  const points = toPointArray(items);
  const isUnavailable = points.length === 1 && points[0] === UNAVAILABLE_TEXT;
  return isUnavailable ? (
    <p className="m-0 text-sm italic text-text-tertiary">{UNAVAILABLE_TEXT}</p>
  ) : (
    <ul className="m-0 list-none pl-0 flex flex-col gap-2">
      {points.map((point, index) => (
        <li
          key={`${point.slice(0, 25)}-${index}`}
          className="flex items-start gap-2 text-sm leading-relaxed text-text-primary"
        >
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-secondary/80" />
          <span>{point}</span>
        </li>
      ))}
    </ul>
  );
}

function getRecommendationDetails(
  policies: PolicyListItem[],
  policyA: string,
  policyB: string,
  policyAMeta: PolicyListItem | undefined,
  policyBMeta: PolicyListItem | undefined,
  rawRecommendations: string[] = []
): {
  suggestedLabel: string | null;
  suggestedName: string | null;
  points: string[];
} {
  const indexA = policies.findIndex((p) => p.id === policyA);
  const indexB = policies.findIndex((p) => p.id === policyB);

  const cleanedRaw = rawRecommendations.filter(
    (point) =>
      point &&
      point !== UNAVAILABLE_TEXT &&
      !point.toLowerCase().includes("winner cannot be determined") &&
      !point.toLowerCase().includes("sufficient evidence to distinguish") &&
      !point.toLowerCase().includes("no meaningful retrieved evidence") &&
      !point.toLowerCase().includes("information not available")
  );

  if (indexA !== -1 && indexB !== -1 && indexA !== indexB) {
    const isAWinner = indexA < indexB;
    const winnerMeta = isAWinner ? policyAMeta : policyBMeta;
    const winnerLabel = isAWinner ? "Policy A" : "Policy B";

    const points = [
      `${winnerLabel} (${winnerMeta?.policy_name || "Selected Policy"}) is the recommended choice for your business.`,
      `Based on your business risk assessment, ${winnerLabel} provides superior priority alignment with your primary operational exposure and protection needs.`,
      ...cleanedRaw,
    ];

    return {
      suggestedLabel: winnerLabel,
      suggestedName: winnerMeta?.policy_name || winnerLabel,
      points,
    };
  }

  if (indexA !== -1 && indexB === -1) {
    const points = [
      `Policy A (${policyAMeta?.policy_name || "Policy A"}) is the recommended choice for your business based on your risk profile.`,
      ...cleanedRaw,
    ];
    return {
      suggestedLabel: "Policy A",
      suggestedName: policyAMeta?.policy_name || "Policy A",
      points,
    };
  }

  if (indexB !== -1 && indexA === -1) {
    const points = [
      `Policy B (${policyBMeta?.policy_name || "Policy B"}) is the recommended choice for your business based on your risk profile.`,
      ...cleanedRaw,
    ];
    return {
      suggestedLabel: "Policy B",
      suggestedName: policyBMeta?.policy_name || "Policy B",
      points,
    };
  }

  const fallbackPoints =
    cleanedRaw.length > 0
      ? cleanedRaw
      : [
          `Both ${policyAMeta?.policy_name || "Policy A"} and ${policyBMeta?.policy_name || "Policy B"} provide viable coverage options. Review the comparison below to select the terms best suited to your operational priorities.`,
        ];

  return {
    suggestedLabel: null,
    suggestedName: null,
    points: fallbackPoints,
  };
}

export default function ComparisonView({
  businessProfileId,
  sessionId,
  recommendedPolicies,
  initialPolicyA = "",
  initialPolicyB = "",
  autoCompare = false,
  openChatSignal = 0,
}: ComparisonViewProps) {
  const [policies, setPolicies] = useState<PolicyListItem[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(!recommendedPolicies);
  const [policyA, setPolicyA] = useState(initialPolicyA);
  const [policyB, setPolicyB] = useState(initialPolicyB);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const lastAutoCompareKey = useRef("");

  const loadPolicies = useCallback(async () => {
    if (recommendedPolicies) {
      setPolicies(recommendedPolicies);
      setLoadingPolicies(false);
      return;
    }
    setLoadingPolicies(true);
    try {
      const data = await fetchPolicies({ limit: 100 });
      setPolicies(data.items);
    } catch {
      setError("Failed to load policies. Please try again.");
    } finally {
      setLoadingPolicies(false);
    }
  }, [recommendedPolicies]);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  useEffect(() => {
    const persistedState = loadComparisonState(sessionId, businessProfileId);
    const hasIncomingSelection = Boolean(initialPolicyA && initialPolicyB);

    if (hasIncomingSelection) {
      setPolicyA(initialPolicyA);
      setPolicyB(initialPolicyB);

      const isSameAsPersisted =
        persistedState &&
        persistedState.result &&
        ((persistedState.policyA === initialPolicyA && persistedState.policyB === initialPolicyB) ||
          (persistedState.policyA === initialPolicyB && persistedState.policyB === initialPolicyA));

      if (isSameAsPersisted) {
        setResult(persistedState.result);
      } else {
        setResult(null);
      }
      setError(null);
      lastAutoCompareKey.current = "";
    } else if (persistedState && persistedState.result) {
      setPolicyA(persistedState.policyA || initialPolicyA);
      setPolicyB(persistedState.policyB || initialPolicyB);
      setResult(persistedState.result);
      setError(null);
      lastAutoCompareKey.current = "";
    } else {
      setPolicyA(initialPolicyA);
      setPolicyB(initialPolicyB);
      setResult(null);
      lastAutoCompareKey.current = "";
    }

    setHasHydrated(true);
  }, [businessProfileId, initialPolicyA, initialPolicyB, sessionId]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!result || !policyA || !policyB) return;

    saveComparisonState(sessionId, businessProfileId, {
      policyA,
      policyB,
      result,
      updatedAt: new Date().toISOString(),
    });
  }, [businessProfileId, hasHydrated, policyA, policyB, result, sessionId]);

  const handleCompare = useCallback(() => {
    if (!policyA || !policyB) return;
    if (policyA === policyB) {
      setError("Please select two different policies to compare.");
      return;
    }

    setError(null);
    setResult(null);
    setComparing(true);

    const payload: CompareRequest = {
      business_profile_id: businessProfileId,
      policy_id_a: policyA,
      policy_id_b: policyB,
      session_id: sessionId,
    };

    comparePolicies(payload)
      .then(setResult)
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Comparison failed. Please try again.",
        );
      })
      .finally(() => setComparing(false));
  }, [businessProfileId, policyA, policyB, sessionId]);

  useEffect(() => {
    if (!autoCompare || !policyA || !policyB || policyA === policyB) return;
    const key = `${businessProfileId}:${sessionId || ""}:${policyA}:${policyB}`;
    if (lastAutoCompareKey.current === key) return;
    lastAutoCompareKey.current = key;
    handleCompare();
  }, [
    autoCompare,
    businessProfileId,
    handleCompare,
    policyA,
    policyB,
    sessionId,
  ]);

  const policyAMeta = policies.find((p) => p.id === policyA);
  const policyBMeta = policies.find((p) => p.id === policyB);

  const { unlockChatbot, lockChatbot } = useNavigationLock();

  useEffect(() => {
    if (result) {
      try {
        unlockChatbot();
      } catch {
        // ignore
      }
    } else {
      try {
        lockChatbot();
      } catch {
        // ignore
      }
    }
  }, [result, unlockChatbot, lockChatbot]);

  function renderPlaceholder() {
    return (
      <div className="flex flex-col items-center gap-3 px-8 py-12 text-center">
        <svg
          className="h-12 w-12 text-text-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 20V10" />
          <path d="M18 20V4" />
          <path d="M6 20v-4" />
          <path d="M2 20h20" />
          <path d="M12 10l4-6" />
          <path d="M12 10l-4-6" />
        </svg>
        <h3 className="text-base font-semibold text-text-primary">
          Policy Comparison
        </h3>
        <p className="max-w-[28rem] text-sm text-text-tertiary">
          Select two insurance policies above and click Compare to see a
          detailed side-by-side analysis across coverage, exclusions, claims,
          and conditions.
        </p>
      </div>
    );
  }

  function renderComparisonSkeleton() {
    const line = (width: string) => (
      <div className={`h-3 animate-pulse rounded-full bg-slate-200 ${width}`} />
    );

    return (
      <div
        className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="relative border-b border-border bg-surface-alt px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-secondary" />
            <div>
              <p className="text-sm font-semibold text-text-primary">Building your policy comparison</p>
              <p className="mt-0.5 text-xs text-text-tertiary">Reviewing coverage, exclusions, and policy terms…</p>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-5">
          <div className="rounded-[var(--radius-md)] border border-border p-4">
            <div className="mb-4 h-4 w-36 animate-pulse rounded-full bg-slate-200" />
            <div className="space-y-3">
              {line('w-full')}
              {line('w-11/12')}
              {line('w-3/4')}
            </div>
          </div>

          <div className="overflow-hidden rounded-[var(--radius-md)] border border-border">
            <div className="grid grid-cols-[22%_39%_39%] gap-4 border-b border-border bg-surface-alt px-4 py-3">
              <div className="h-3 w-16 animate-pulse rounded-full bg-slate-200" />
              <div className="h-3 w-20 animate-pulse rounded-full bg-slate-200" />
              <div className="h-3 w-20 animate-pulse rounded-full bg-slate-200" />
            </div>
            {[0, 1, 2].map((row) => (
              <div key={row} className="grid grid-cols-[22%_39%_39%] gap-4 border-b border-border px-4 py-4 last:border-b-0">
                <div className="h-4 w-20 animate-pulse rounded-full bg-slate-200" />
                <div className="space-y-2">{line('w-full')}{line('w-4/5')}</div>
                <div className="space-y-2">{line('w-11/12')}{line('w-3/4')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderResults() {
    if (!result) return null;

    const recommendationDetails = getRecommendationDetails(
      policies,
      policyA,
      policyB,
      policyAMeta,
      policyBMeta,
      result.overall_recommendation
    );

    const executiveSummaryPoints = (result.executive_summary || []).filter(
      (item) => item !== UNAVAILABLE_TEXT && !item.toLowerCase().includes("information not available")
    );
    const finalExecutiveSummary =
      executiveSummaryPoints.length > 0
        ? executiveSummaryPoints
        : [
            `Retrieved policy terms and coverage details for ${policyAMeta?.policy_name || "Policy A"} and ${policyBMeta?.policy_name || "Policy B"}.`,
            "Review the section-by-section comparison below for specific terms and benefits.",
          ];

    return (
      <div className="flex flex-col gap-6">
        {policyAMeta && policyBMeta && (
          <div className="mb-2 flex gap-4">
            <div className="flex-1 rounded-[var(--radius-md)] border border-risk-low bg-risk-low-bg px-3 py-2 text-center text-[13px] font-semibold text-risk-low">
              A: {policyAMeta.policy_name} ({policyAMeta.insurer_name})
            </div>
            <div className="flex-1 rounded-[var(--radius-md)] border border-risk-medium bg-risk-medium-bg px-3 py-2 text-center text-[13px] font-semibold text-risk-medium">
              B: {policyBMeta.policy_name} ({policyBMeta.insurer_name})
            </div>
          </div>
        )}

        {/* Executive Summary */}
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
          <div className="border-b border-border bg-surface-alt px-5 py-3.5 flex items-center gap-2">
            <span className="text-lg">📊</span>
            <span className="text-[15px] font-bold text-text-primary">
              Executive Summary
            </span>
          </div>
          <div className="px-5 py-4">
            <PointList items={finalExecutiveSummary} />
          </div>
        </div>

        {/* Section-by-Section Comparison */}
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
          <div className="border-b border-border bg-surface-alt px-5 py-3.5 flex items-center gap-2">
            <span className="text-lg">⚖️</span>
            <span className="text-[15px] font-bold text-text-primary">
              Section-by-Section Comparison
            </span>
          </div>
          <div className="p-0">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-[20%] border-b-2 border-border bg-surface-alt px-4 py-3 text-left text-[13px] font-bold uppercase tracking-[0.04em] text-text-secondary">
                    Category
                  </th>
                  <th className="w-[40%] border-b-2 border-border bg-surface-alt px-4 py-3 text-left text-[13px] font-bold uppercase tracking-[0.04em] text-primary">
                    Policy A{policyAMeta ? ` — ${policyAMeta.policy_name}` : ""}
                  </th>
                  <th className="w-[40%] border-b-2 border-border bg-surface-alt px-4 py-3 text-left text-[13px] font-bold uppercase tracking-[0.04em] text-risk-medium">
                    Policy B{policyBMeta ? ` — ${policyBMeta.policy_name}` : ""}
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.comparisons.map((item) => {
                  const catIcon = CATEGORY_ICONS[item.category] ||
                    CATEGORY_ICONS[
                      CATEGORY_LABELS[item.category] || ""
                    ] || { icon: "📄", color: "text-slate-500" };
                  return (
                    <tr key={item.category}>
                      <td className="w-[20%] border-b border-border px-4 py-4 align-top">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{catIcon.icon}</span>
                          <span className="text-sm font-semibold text-text-primary">
                            {CATEGORY_LABELS[item.category] || item.category}
                          </span>
                        </div>
                      </td>
                      <td className="w-[40%] border-b border-border px-4 py-4 align-top text-sm leading-6 text-text-primary">
                        <PointList items={item.policy_a_value} />
                      </td>
                      <td className="w-[40%] border-b border-border px-4 py-4 align-top text-sm leading-6 text-text-primary">
                        <PointList items={item.policy_b_value} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>


        {/* Advantages & Limitations */}
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
          <div className="border-b border-border bg-surface-alt px-5 py-3.5 flex items-center gap-2">
            <span className="text-lg">📋</span>
            <span className="text-[15px] font-bold text-text-primary">
              Advantages & Limitations
            </span>
          </div>
          <div className="px-5 py-4">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Policy A */}
              <div>
                <div className="mb-3 text-[15px] font-bold text-primary">
                  Policy A — Advantages
                </div>
                <div className="flex flex-col gap-2">
                  {(result.advantages_a.length > 0
                    ? result.advantages_a
                    : [UNAVAILABLE_TEXT]
                  ).map((adv, i) => {
                    const isNA = adv === UNAVAILABLE_TEXT;
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-2.5 rounded-[var(--radius-md)] px-3 py-2 ${
                          isNA
                            ? "text-text-tertiary italic"
                            : "bg-[#E8F5E9] border border-[#4CAF50]/20"
                        }`}
                      >
                        {!isNA && (
                          <span className="mt-0.5 text-[#4CAF50] text-sm font-bold shrink-0">
                            ✓
                          </span>
                        )}
                        <span className="text-sm leading-6 text-text-primary">
                          {adv}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 mb-3 text-[13px] font-semibold uppercase tracking-[0.03em] text-text-secondary">
                  Limitations
                </div>
                <div className="flex flex-col gap-2">
                  {(result.limitations_a.length > 0
                    ? result.limitations_a
                    : [UNAVAILABLE_TEXT]
                  ).map((lim, i) => {
                    const isNA = lim === UNAVAILABLE_TEXT;
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-2.5 rounded-[var(--radius-md)] px-3 py-2 ${
                          isNA
                            ? "text-text-tertiary italic"
                            : "bg-[#FFEBEE] border border-[#EF5350]/20"
                        }`}
                      >
                        {!isNA && (
                          <span className="mt-0.5 text-[#EF5350] text-sm font-bold shrink-0">
                            ✗
                          </span>
                        )}
                        <span className="text-sm leading-6 text-text-primary">
                          {lim}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Policy B */}
              <div>
                <div className="mb-3 text-[15px] font-bold text-primary">
                  Policy B — Advantages
                </div>
                <div className="flex flex-col gap-2">
                  {(result.advantages_b.length > 0
                    ? result.advantages_b
                    : [UNAVAILABLE_TEXT]
                  ).map((adv, i) => {
                    const isNA = adv === UNAVAILABLE_TEXT;
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-2.5 rounded-[var(--radius-md)] px-3 py-2 ${
                          isNA
                            ? "text-text-tertiary italic"
                            : "bg-[#E8F5E9] border border-[#4CAF50]/20"
                        }`}
                      >
                        {!isNA && (
                          <span className="mt-0.5 text-[#4CAF50] text-sm font-bold shrink-0">
                            ✓
                          </span>
                        )}
                        <span className="text-sm leading-6 text-text-primary">
                          {adv}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 mb-3 text-[13px] font-semibold uppercase tracking-[0.03em] text-text-secondary">
                  Limitations
                </div>
                <div className="flex flex-col gap-2">
                  {(result.limitations_b.length > 0
                    ? result.limitations_b
                    : [UNAVAILABLE_TEXT]
                  ).map((lim, i) => {
                    const isNA = lim === UNAVAILABLE_TEXT;
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-2.5 rounded-[var(--radius-md)] px-3 py-2 ${
                          isNA
                            ? "text-text-tertiary italic"
                            : "bg-[#FFEBEE] border border-[#EF5350]/20"
                        }`}
                      >
                        {!isNA && (
                          <span className="mt-0.5 text-[#EF5350] text-sm font-bold shrink-0">
                            ✗
                          </span>
                        )}
                        <span className="text-sm leading-6 text-text-primary">
                          {lim}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Overall Recommendation */}
        <div className="overflow-hidden rounded-[var(--radius-lg)] border-2 border-risk-low bg-risk-low-bg">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-risk-low/30">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">💡</span>
              <span className="text-[15px] font-bold text-risk-low">
                Overall Recommendation
              </span>
            </div>
            {recommendationDetails.suggestedLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-risk-low px-3 py-1 text-xs font-bold text-white shadow-sm">
                <span>Suggested: {recommendationDetails.suggestedLabel}</span>
              </span>
            )}
          </div>
          <div className="px-5 py-4">
            <PointList items={recommendationDetails.points} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid items-end gap-4 md:grid-cols-[1fr_auto_1fr]">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-text-secondary">
            Policy A
          </label>
          <select
            className="w-full cursor-pointer rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-secondary disabled:cursor-not-allowed disabled:opacity-60"
            value={policyA}
            onChange={(e) => {
              lastAutoCompareKey.current = "";
              setPolicyA(e.target.value);
              setResult(null);
              setError(null);
            }}
            disabled={loadingPolicies || comparing}
          >
            <option value="">Select a policy...</option>
            {policies.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === policyB}>
                {p.insurer_name} — {p.policy_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-center pb-1 text-sm font-bold text-text-tertiary">
          VS
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-text-secondary">
            Policy B
          </label>
          <select
            className="w-full cursor-pointer rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-secondary disabled:cursor-not-allowed disabled:opacity-60"
            value={policyB}
            onChange={(e) => {
              lastAutoCompareKey.current = "";
              setPolicyB(e.target.value);
              setResult(null);
              setError(null);
            }}
            disabled={loadingPolicies || comparing}
          >
            <option value="">Select a policy...</option>
            {policies.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === policyA}>
                {p.insurer_name} — {p.policy_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        className="self-center rounded-[var(--radius-md)] bg-secondary px-8 py-2.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={handleCompare}
        disabled={!policyA || !policyB || policyA === policyB || comparing}
      >
        {comparing ? "Comparing..." : "Compare"}
      </button>

      {comparing && renderComparisonSkeleton()}

      {error && (
        <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-risk-medium-bg)] bg-[var(--color-risk-medium-bg)] px-4 py-3 text-sm text-[var(--color-risk-medium)]">
          <span>{error}</span>
          <button
            type="button"
            className="rounded-[var(--radius-md)] border-none bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-[var(--color-risk-medium)] shadow-sm"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {!comparing && !error && (result ? renderResults() : renderPlaceholder())}

      <ComparisonChatPopUp
        openSignal={openChatSignal}
        hasComparison={Boolean(result)}
        compareParams={{
          business_profile_id: businessProfileId,
          policy_id_a: policyA,
          policy_id_b: policyB,
          session_id: sessionId,
        }}
      />
    </div>
  );
}
