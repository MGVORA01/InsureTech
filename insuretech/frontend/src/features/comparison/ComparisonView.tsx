import { useCallback, useEffect, useState } from 'react'
import { fetchPolicies } from '../policies/policiesApi'
import { comparePolicies } from './comparisonApi'
import type { PolicyListItem } from '../policies/policies.types'
import type { CompareRequest, CompareResponse } from './comparison.types'
import ComparisonChatPopUp from './ComparisonChatPopUp'
import styles from './ComparisonView.module.css'

interface ComparisonViewProps {
  businessProfileId: string
}

const CATEGORY_LABELS: Record<string, string> = {
  coverage: 'Coverage',
  exclusions: 'Exclusions',
  claims: 'Claims Process',
  financial: 'Financials',
  conditions: 'Terms & Conditions',
}

export default function ComparisonView({ businessProfileId }: ComparisonViewProps) {
  const [policies, setPolicies] = useState<PolicyListItem[]>([])
  const [loadingPolicies, setLoadingPolicies] = useState(true)
  const [policyA, setPolicyA] = useState('')
  const [policyB, setPolicyB] = useState('')
  const [comparing, setComparing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CompareResponse | null>(null)

  const loadPolicies = useCallback(async () => {
    setLoadingPolicies(true)
    try {
      const data = await fetchPolicies({ limit: 100 })
      setPolicies(data.items)
    } catch {
      setError('Failed to load policies. Please try again.')
    } finally {
      setLoadingPolicies(false)
    }
  }, [])

  useEffect(() => {
    loadPolicies()
  }, [loadPolicies])

  function handleCompare() {
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
    }

    comparePolicies(payload)
      .then(setResult)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Comparison failed. Please try again.')
      })
      .finally(() => setComparing(false))
  }

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
                  <th className={styles.compTableStronger}>Stronger</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {result.comparisons.map((item) => (
                  <tr key={item.category}>
                    <td className={`${styles.compTableCategory} ${styles.compTableValue}`}>
                      {CATEGORY_LABELS[item.category] || item.category}
                    </td>
                    <td className={styles.compTableValue}>{item.policy_a_value}</td>
                    <td className={styles.compTableValue}>{item.policy_b_value}</td>
                    <td>
                      <span className={`${styles.strongerBadge} ${
                        item.stronger === 'a' ? styles.strongerA
                        : item.stronger === 'b' ? styles.strongerB
                        : item.stronger === 'equal' ? styles.strongerEqual
                        : styles.strongerInsufficient
                      }`}>
                        {item.stronger === 'a' ? 'Policy A'
                          : item.stronger === 'b' ? 'Policy B'
                          : item.stronger === 'equal' ? 'Equal'
                          : 'Insufficient Evidence'}
                      </span>
                      <div className={styles.confidenceBadge}>
                        Confidence: {item.confidence}
                      </div>
                    </td>
                    <td>
                      <span className={styles.evidenceText}>{item.evidence}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Coverage Gap Analysis */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>Coverage Gap Analysis</div>
          <div className={styles.sectionBody}>
            <p>{result.coverage_gap_analysis}</p>
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
                    {result.advantages_a.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
                <div className={styles.listBlock} style={{ marginTop: '1rem' }}>
                  <div className={styles.listBlockTitle}>Limitations</div>
                  <ul>
                    {result.limitations_a.map((l, i) => <li key={i}>{l}</li>)}
                  </ul>
                </div>
              </div>
              <div>
                <div className={styles.policyColLabel}>Policy B — Advantages</div>
                <div className={styles.listBlock}>
                  <ul>
                    {result.advantages_b.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
                <div className={styles.listBlock} style={{ marginTop: '1rem' }}>
                  <div className={styles.listBlockTitle}>Limitations</div>
                  <ul>
                    {result.limitations_b.map((l, i) => <li key={i}>{l}</li>)}
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

        {/* Confidence */}
        <div className={styles.confidenceFooter}>
          <span className={`${styles.confidenceDot} ${
            result.overall_confidence === 'high' ? styles.confidenceHigh
            : result.overall_confidence === 'medium' ? styles.confidenceMedium
            : styles.confidenceLow
          }`} />
          Overall confidence: <strong>{result.overall_confidence.toUpperCase()}</strong>
        </div>
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
            onChange={(e) => { setPolicyA(e.target.value); setResult(null); setError(null) }}
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
            onChange={(e) => { setPolicyB(e.target.value); setResult(null); setError(null) }}
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
        compareParams={{
          business_profile_id: businessProfileId,
          policy_id_a: policyA,
          policy_id_b: policyB,
        }}
      />
    </div>
  )
}
