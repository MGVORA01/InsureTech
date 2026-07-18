import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchPolicies } from '../policies/policiesApi'
import { comparePolicies } from './comparisonApi'
import type { PolicyListItem } from '../policies/policies.types'
import type { CompareRequest, CompareResponse } from './comparison.types'
import ComparisonChatPopUp from './ComparisonChatPopUp'
import { useNavigationLock } from '../../store/navigationLock'
import { loadComparisonState, saveComparisonState } from './comparisonStorage'

interface ComparisonViewProps {
  businessProfileId: string
  sessionId?: string
  recommendedPolicies?: PolicyListItem[]
  initialPolicyA?: string
  initialPolicyB?: string
  autoCompare?: boolean
  openChatSignal?: number
}

const CATEGORY_LABELS: Record<string, string> = {
  'What is Covered': 'What is Covered',
  Coverage: 'Coverage',
  Exclusions: 'Exclusions',
  'Claims Process': 'Claims Process',
  Conditions: 'Conditions',
  coverage: 'Coverage',
  exclusions: 'Exclusions',
  claims: 'Claims Process',
  financial: 'Financials',
  conditions: 'Terms & Conditions',
}

const UNAVAILABLE_TEXT = 'Information not available in the selected policies.'

function splitIntoPoints(value: string): string[] {
  const cleaned = value.trim()
  if (!cleaned) return [UNAVAILABLE_TEXT]

  const explicitPoints = cleaned
    .split(/\n+|(?:^|\s)[-*]\s+|(?:^|\s)\d+\.\s+/)
    .map((point) => point.trim())
    .filter(Boolean)

  if (explicitPoints.length > 1) return explicitPoints.slice(0, 5)

  const sentencePoints = cleaned
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
    ?.map((point) => point.trim())
    .filter(Boolean)

  if (sentencePoints && sentencePoints.length > 1) return sentencePoints.slice(0, 4)
  return [cleaned]
}

function PointList({ value }: { value: string }) {
  const points = splitIntoPoints(value)
  return (
    <ul className="m-0 list-disc pl-[1.1rem]">
      {points.map((point, index) => (
        <li key={`${point}-${index}`} className="mb-1.5 last:mb-0">
          {point}
        </li>
      ))}
    </ul>
  )
}

function renderListItems(items: string[]) {
  const safeItems = items.length > 0
    ? items.flatMap((item) => splitIntoPoints(item))
    : [UNAVAILABLE_TEXT]
  return safeItems.map((item, index) => <li key={`${item}-${index}`} className="mb-1 text-sm leading-6 text-text-primary">{item}</li>)
}

export default function ComparisonView({
  businessProfileId,
  sessionId,
  recommendedPolicies,
  initialPolicyA = '',
  initialPolicyB = '',
  autoCompare = false,
  openChatSignal = 0,
}: ComparisonViewProps) {
  const [policies, setPolicies] = useState<PolicyListItem[]>([])
  const [loadingPolicies, setLoadingPolicies] = useState(!recommendedPolicies)
  const [policyA, setPolicyA] = useState(initialPolicyA)
  const [policyB, setPolicyB] = useState(initialPolicyB)
  const [comparing, setComparing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CompareResponse | null>(null)
  const [hasHydrated, setHasHydrated] = useState(false)
  const lastAutoCompareKey = useRef('')

  const loadPolicies = useCallback(async () => {
    if (recommendedPolicies) {
      setPolicies(recommendedPolicies)
      setLoadingPolicies(false)
      return
    }
    setLoadingPolicies(true)
    try {
      const data = await fetchPolicies({ limit: 100 })
      setPolicies(data.items)
    } catch {
      setError('Failed to load policies. Please try again.')
    } finally {
      setLoadingPolicies(false)
    }
  }, [recommendedPolicies])

  useEffect(() => {
    loadPolicies()
  }, [loadPolicies])

  useEffect(() => {
    const persistedState = loadComparisonState(sessionId, businessProfileId)
    const hasIncomingSelection = Boolean(initialPolicyA || initialPolicyB)

    if (hasIncomingSelection) {
      setPolicyA(initialPolicyA)
      setPolicyB(initialPolicyB)
      setResult(null)
      setError(null)
      lastAutoCompareKey.current = ''
    } else if (persistedState) {
      setPolicyA(persistedState.policyA || initialPolicyA)
      setPolicyB(persistedState.policyB || initialPolicyB)
      setResult(persistedState.result)
      setError(null)
      lastAutoCompareKey.current = ''
    } else {
      setPolicyA(initialPolicyA)
      setPolicyB(initialPolicyB)
      setResult(null)
      lastAutoCompareKey.current = ''
    }

    setHasHydrated(true)
  }, [businessProfileId, initialPolicyA, initialPolicyB, sessionId])

  useEffect(() => {
    if (!hasHydrated) return

    saveComparisonState(sessionId, businessProfileId, {
      policyA,
      policyB,
      result,
      updatedAt: new Date().toISOString(),
    })
  }, [businessProfileId, hasHydrated, policyA, policyB, result, sessionId])

  const handleCompare = useCallback(() => {
    if (!policyA || !policyB) return
    if (policyA === policyB) {
      setError('Please select two different policies to compare.')
      return
    }

    setError(null)
    setResult(null)
    setComparing(true)

    const payload: CompareRequest = {
      business_profile_id: businessProfileId,
      policy_id_a: policyA,
      policy_id_b: policyB,
      session_id: sessionId,
    }

    comparePolicies(payload)
      .then(setResult)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Comparison failed. Please try again.')
      })
      .finally(() => setComparing(false))
  }, [businessProfileId, policyA, policyB, sessionId])

  useEffect(() => {
    if (!autoCompare || !policyA || !policyB || policyA === policyB) return
    const key = `${businessProfileId}:${sessionId || ''}:${policyA}:${policyB}`
    if (lastAutoCompareKey.current === key) return
    lastAutoCompareKey.current = key
    handleCompare()
  }, [autoCompare, businessProfileId, handleCompare, policyA, policyB, sessionId])

  const policyAMeta = policies.find((p) => p.id === policyA)
  const policyBMeta = policies.find((p) => p.id === policyB)

  const { unlockChatbot } = useNavigationLock()

  useEffect(() => {
    if (result) {
      try {
        unlockChatbot()
      } catch {
        // ignore
      }
    }
  }, [result, unlockChatbot])

  function renderPlaceholder() {
    return (
      <div className="flex flex-col items-center gap-3 px-8 py-12 text-center">
        <svg className="h-12 w-12 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20V10" />
          <path d="M18 20V4" />
          <path d="M6 20v-4" />
          <path d="M2 20h20" />
          <path d="M12 10l4-6" />
          <path d="M12 10l-4-6" />
        </svg>
        <h3 className="text-base font-semibold text-text-primary">Policy Comparison</h3>
        <p className="max-w-[28rem] text-sm text-text-tertiary">
          Select two insurance policies above and click Compare to see a detailed side-by-side analysis across coverage, exclusions, claims, financials, and terms.
        </p>
      </div>
    )
  }

  function renderResults() {
    if (!result) return null

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

        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
          <div className="border-b border-border bg-surface-alt px-5 py-3.5 text-[15px] font-bold text-text-primary">Executive Summary</div>
          <div className="px-5 py-4">
            <p className="m-0 text-sm leading-7 text-text-primary">{result.executive_summary}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
          <div className="border-b border-border bg-surface-alt px-5 py-3.5 text-[15px] font-bold text-text-primary">Section-by-Section Comparison</div>
          <div className="p-0">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-[20%] border-b-2 border-border bg-surface-alt px-4 py-3 text-left text-[13px] font-bold uppercase tracking-[0.04em] text-text-secondary">Category</th>
                  <th className="w-[40%] border-b-2 border-border bg-surface-alt px-4 py-3 text-left text-[13px] font-bold uppercase tracking-[0.04em] text-text-secondary">Policy A</th>
                  <th className="w-[40%] border-b-2 border-border bg-surface-alt px-4 py-3 text-left text-[13px] font-bold uppercase tracking-[0.04em] text-text-secondary">Policy B</th>
                </tr>
              </thead>
              <tbody>
                {result.comparisons.map((item) => (
                  <tr key={item.category}>
                    <td className="w-[20%] border-b border-border px-4 py-4 text-sm font-semibold text-text-primary">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </td>
                    <td className="w-[40%] border-b border-border px-4 py-4 text-sm leading-6 text-text-primary"><PointList value={item.policy_a_value} /></td>
                    <td className="w-[40%] border-b border-border px-4 py-4 text-sm leading-6 text-text-primary"><PointList value={item.policy_b_value} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
          <div className="border-b border-border bg-surface-alt px-5 py-3.5 text-[15px] font-bold text-text-primary">Business Risk Alignment</div>
          <div className="px-5 py-4">
            <p className="m-0 text-sm leading-7 text-text-primary">{result.business_risk_alignment}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
          <div className="border-b border-border bg-surface-alt px-5 py-3.5 text-[15px] font-bold text-text-primary">Advantages & Limitations</div>
          <div className="px-5 py-4">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="mb-3 text-[15px] font-bold text-primary">Policy A — Advantages</div>
                <div className="flex flex-col gap-2">
                  <ul className="m-0 pl-5">
                    {renderListItems(result.advantages_a)}
                  </ul>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <div className="text-[13px] font-semibold uppercase tracking-[0.03em] text-text-secondary">Limitations</div>
                  <ul className="m-0 pl-5">
                    {renderListItems(result.limitations_a)}
                  </ul>
                </div>
              </div>
              <div>
                <div className="mb-3 text-[15px] font-bold text-primary">Policy B — Advantages</div>
                <div className="flex flex-col gap-2">
                  <ul className="m-0 pl-5">
                    {renderListItems(result.advantages_b)}
                  </ul>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <div className="text-[13px] font-semibold uppercase tracking-[0.03em] text-text-secondary">Limitations</div>
                  <ul className="m-0 pl-5">
                    {renderListItems(result.limitations_b)}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-risk-low bg-risk-low-bg p-5">
          <div className="mb-2 text-[15px] font-bold text-risk-low">Overall Recommendation</div>
          <p className="m-0 text-sm leading-7 text-text-primary">{result.overall_recommendation}</p>
        </div>

        {result.missing_information.length > 0 && (
          <div className="rounded-[var(--radius-md)] bg-surface-alt px-4 py-3 text-[13px] text-text-tertiary">
            <strong>Missing Information:</strong> Some details could not be retrieved from the policy documents.
            <ul className="mt-1.5 pl-5">
              {result.missing_information.map((m, i) => <li key={i} className="mb-0.5">{m}</li>)}
            </ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid items-end gap-4 md:grid-cols-[1fr_auto_1fr]">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-text-secondary">Policy A</label>
          <select
            className="w-full cursor-pointer rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-secondary disabled:cursor-not-allowed disabled:opacity-60"
            value={policyA}
            onChange={(e) => {
              lastAutoCompareKey.current = ''
              setPolicyA(e.target.value)
              setResult(null)
              setError(null)
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

        <div className="flex items-center justify-center pb-1 text-sm font-bold text-text-tertiary">VS</div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-text-secondary">Policy B</label>
          <select
            className="w-full cursor-pointer rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-secondary disabled:cursor-not-allowed disabled:opacity-60"
            value={policyB}
            onChange={(e) => {
              lastAutoCompareKey.current = ''
              setPolicyB(e.target.value)
              setResult(null)
              setError(null)
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
        {comparing ? 'Comparing...' : 'Compare'}
      </button>

      {comparing && (
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] bg-surface-alt p-8 text-sm text-text-tertiary">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-border border-t-secondary" />
          <p>Analyzing policies... This may take a moment.</p>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-risk-medium-bg)] bg-[var(--color-risk-medium-bg)] px-4 py-3 text-sm text-[var(--color-risk-medium)]">
          <span>{error}</span>
          <button type="button" className="rounded-[var(--radius-md)] border-none bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-[var(--color-risk-medium)] shadow-sm" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {!comparing && !error && (result ? renderResults() : renderPlaceholder())}

      <ComparisonChatPopUp
        openSignal={openChatSignal}
        compareParams={{
          business_profile_id: businessProfileId,
          policy_id_a: policyA,
          policy_id_b: policyB,
          session_id: sessionId,
        }}
      />
    </div>
  )
}
