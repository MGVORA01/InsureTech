import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchPolicies } from '../policies/policiesApi'
import { comparePolicies } from './comparisonApi'
import type { PolicyListItem } from '../policies/policies.types'
import type { CompareRequest, CompareResponse } from './comparison.types'
import ComparisonChatPopUp from './ComparisonChatPopUp'
import styles from './ComparisonView.module.css'

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
    <ul className={styles.pointList}>
      {points.map((point, index) => (
        <li key={`${point}-${index}`}>{point}</li>
      ))}
    </ul>
  )
}

function renderListItems(items: string[]) {
  const safeItems = items.length > 0
    ? items.flatMap((item) => splitIntoPoints(item))
    : [UNAVAILABLE_TEXT]
  return safeItems.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)
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
    setPolicyA(initialPolicyA)
    setPolicyB(initialPolicyB)
    setResult(null)
    lastAutoCompareKey.current = ''
  }, [initialPolicyA, initialPolicyB])

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

  function renderPlaceholder() {
    return (
      <div className={styles.placeholder}>
        <svg className={styles.placeholderIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20V10" />
          <path d="M18 20V4" />
          <path d="M6 20v-4" />
          <path d="M2 20h20" />
          <path d="M12 10l4-6" />
          <path d="M12 10l-4-6" />
        </svg>
        <h3 className={styles.placeholderTitle}>Policy Comparison</h3>
        <p className={styles.placeholderText}>
          Select two insurance policies above and click Compare to see a detailed side-by-side analysis across coverage, exclusions, claims, financials, and terms.
        </p>
      </div>
    )
  }

  function renderResults() {
    if (!result) return null

    return (
      <div className={styles.results}>
        {/* Policy name labels */}
        {policyAMeta && policyBMeta && (
          <div className={styles.policyLabels}>
            <div className={`${styles.policyLabel} ${styles.policyLabelA}`}>
              A: {policyAMeta.policy_name} ({policyAMeta.insurer_name})
            </div>
            <div className={`${styles.policyLabel} ${styles.policyLabelB}`}>
              B: {policyBMeta.policy_name} ({policyBMeta.insurer_name})
            </div>
          </div>
        )}

        {/* Executive Summary */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>Executive Summary</div>
          <div className={styles.sectionBody}>
            <p>{result.executive_summary}</p>
          </div>
        </div>

        {/* Comparison Table */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>Section-by-Section Comparison</div>
          <div className={styles.sectionBody} style={{ padding: 0 }}>
            <table className={styles.compTable}>
              <thead>
                <tr>
                  <th className={styles.compTableCategory}>Category</th>
                  <th className={styles.compTableValue}>Policy A</th>
                  <th className={styles.compTableValue}>Policy B</th>
                </tr>
              </thead>
              <tbody>
                {result.comparisons.map((item) => (
                  <tr key={item.category}>
                    <td className={`${styles.compTableCategory} ${styles.compTableValue}`}>
                      {CATEGORY_LABELS[item.category] || item.category}
                    </td>
                    <td className={styles.compTableValue}><PointList value={item.policy_a_value} /></td>
                    <td className={styles.compTableValue}><PointList value={item.policy_b_value} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Business Risk Alignment */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>Business Risk Alignment</div>
          <div className={styles.sectionBody}>
            <p>{result.business_risk_alignment}</p>
          </div>
        </div>

        {/* Advantages & Limitations */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>Advantages & Limitations</div>
          <div className={styles.sectionBody}>
            <div className={styles.twoCol}>
              <div>
                <div className={styles.policyColLabel}>Policy A — Advantages</div>
                <div className={styles.listBlock}>
                  <ul>
                    {renderListItems(result.advantages_a)}
                  </ul>
                </div>
                <div className={styles.listBlock} style={{ marginTop: '1rem' }}>
                  <div className={styles.listBlockTitle}>Limitations</div>
                  <ul>
                    {renderListItems(result.limitations_a)}
                  </ul>
                </div>
              </div>
              <div>
                <div className={styles.policyColLabel}>Policy B — Advantages</div>
                <div className={styles.listBlock}>
                  <ul>
                    {renderListItems(result.advantages_b)}
                  </ul>
                </div>
                <div className={styles.listBlock} style={{ marginTop: '1rem' }}>
                  <div className={styles.listBlockTitle}>Limitations</div>
                  <ul>
                    {renderListItems(result.limitations_b)}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Overall Recommendation */}
        <div className={styles.recommendation}>
          <div className={styles.recommendationTitle}>Overall Recommendation</div>
          <p>{result.overall_recommendation}</p>
        </div>

        {/* Missing Information */}
        {result.missing_information.length > 0 && (
          <div className={styles.missingInfo}>
            <strong>Missing Information:</strong> Some details could not be retrieved from the policy documents.
            <ul>
              {result.missing_information.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        )}

      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Policy Selectors */}
      <div className={styles.selectorsRow}>
        <div className={styles.selectorGroup}>
          <label className={styles.selectorLabel}>Policy A</label>
          <select
            className={styles.policySelect}
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

        <div className={styles.selectorVs}>VS</div>

        <div className={styles.selectorGroup}>
          <label className={styles.selectorLabel}>Policy B</label>
          <select
            className={styles.policySelect}
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

      {/* Compare Button */}
      <button
        className={styles.compareBtn}
        onClick={handleCompare}
        disabled={!policyA || !policyB || policyA === policyB || comparing}
      >
        {comparing ? 'Comparing...' : 'Compare'}
      </button>

      {/* Loading */}
      {comparing && (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Analyzing policies... This may take a moment.</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <button type="button" className={styles.retryBtn} onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Results or Placeholder */}
      {!comparing && !error && (result ? renderResults() : renderPlaceholder())}

      {/* Comparison Chat Popup */}
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
