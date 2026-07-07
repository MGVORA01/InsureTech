import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { profilingApi, getProfilingErrorMessage } from './profilingApi'
import { PROFILING_MESSAGES, SECTION_LABELS, SECTIONS_ORDER } from './profiling.constants'
import type {
  PreviewScoreOut,
  ProfilingCompleteOut,
  ProfilingPhase,
  QuestionOut,
  SectionQuestionsOut,
  Tier2QuestionOut,
} from './profiling.types'
import QuestionRenderer from './QuestionRenderer'

interface ProfilingWizardProps {
  onComplete: (data: ProfilingCompleteOut) => void
  onSeeRecommendations?: (data: ProfilingCompleteOut) => void
  onCancel: () => void
  businessId?: string
}

const RISK_WEIGHTS: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

export default function ProfilingWizard({ onComplete, onSeeRecommendations, onCancel, businessId }: ProfilingWizardProps) {
  const [phase, setPhase] = useState<ProfilingPhase>('tier1')
  const [section, setSection] = useState<SectionQuestionsOut | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [allQuestions, setAllQuestions] = useState<QuestionOut[]>([])
  const [previewScores, setPreviewScores] = useState<PreviewScoreOut[]>([])
  const [tier2Questions, setTier2Questions] = useState<Tier2QuestionOut[]>([])
  const [finished, setFinished] = useState(false)
  const uniqueT2Questions = useMemo(
    () => Array.from(new Map(tier2Questions.map(t => [t.question.id, t.question])).values()),
    [tier2Questions],
  )
  const mountedRef = useRef(true)

  const getVisibleQuestions = useCallback(
    (questions: QuestionOut[], ans: Record<string, string>): QuestionOut[] => {
      const roots = questions.filter((q) => !q.parent_question_id)
      const visible: QuestionOut[] = []
      const queue: QuestionOut[] = []
      const seen = new Set<string>()

      for (const q of roots) {
        if (!seen.has(q.id)) {
          seen.add(q.id)
          visible.push(q)
          queue.push(q)
        }
      }

      while (queue.length > 0) {
        const q = queue.shift()!
        const answer = ans[q.id]
        if (!answer) continue

        for (const child of questions) {
          if (
            child.parent_question_id === q.id &&
            child.parent_answer_value === answer &&
            !seen.has(child.id)
          ) {
            seen.add(child.id)
            visible.push(child)
            queue.push(child)
          }
        }
      }

      return visible
    },
    [],
  )

  const initSession = useCallback(async (tier?: number) => {
    setLoading(true)
    setError(null)
    try {
      const result = await profilingApi.startSession(tier, businessId)
      if (!mountedRef.current) return
      
      let currentResult = result;
      while (currentResult.questions.length === 0 && currentResult.section_index < currentResult.total_sections - 1) {
          currentResult = await profilingApi.getSessionState(currentResult.session.id, SECTIONS_ORDER[currentResult.section_index + 1], tier);
      }

      setSection(currentResult)
      setSessionId(currentResult.session.id)
      setAllQuestions(currentResult.questions)
      const initialAnswers: Record<string, string> = {}
      for (const q of currentResult.questions) {
        initialAnswers[q.id] = currentResult.answers[q.id] ?? ''
      }
      setAnswers(initialAnswers)
    } catch (err) {
      if (mountedRef.current) setError(getProfilingErrorMessage(err))
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    mountedRef.current = true
    initSession(1)
    return () => { mountedRef.current = false }
  }, [initSession])

  const visibleQuestions = useMemo(
    () => getVisibleQuestions(allQuestions, answers),
    [allQuestions, answers, getVisibleQuestions],
  )

  useEffect(() => {
    if (!allQuestions.length) return
    const visible = getVisibleQuestions(allQuestions, answers)
    setSection(prev => {
      if (!prev) return prev
      const same =
        prev.questions.length === visible.length &&
        prev.questions.every((q, i) => q.id === visible[i].id)
      if (same) return prev
      return { ...prev, questions: visible }
    })
  }, [answers, allQuestions, getVisibleQuestions])

  const validateSection = (): boolean => {
    if (!section) return false
    const newErrors: Record<string, string> = {}
    for (const q of visibleQuestions) {
      const val = answers[q.id]?.trim()
      if (!val) {
        newErrors[q.id] = PROFILING_MESSAGES.requiredField
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const loadSection = useCallback(async (targetSection: string, tier?: number, direction: 'forward' | 'backward' = 'forward') => {
    if (!sessionId) return
    setLoading(true)
    setError(null)
    try {
      const result = await profilingApi.getSessionState(sessionId, targetSection, tier)
      if (!mountedRef.current) return
      
      if (result.questions.length === 0) {
        if (direction === 'forward' && result.section_index < result.total_sections - 1) {
          const nextTarget = SECTIONS_ORDER[result.section_index + 1]
          await loadSection(nextTarget, tier, direction)
          return
        } else if (direction === 'backward') {
          if (result.section_index > 0) {
            const prevTarget = SECTIONS_ORDER[result.section_index - 1]
            await loadSection(prevTarget, tier, direction)
            return
          } else {
            // Reached the very first section navigating backward, and it's empty. Exit the wizard.
            onCancel()
            return
          }
        }
      }

      setSection(result)
      setAllQuestions(result.questions)
      const merged: Record<string, string> = {}
      for (const q of result.questions) {
        merged[q.id] = result.answers[q.id] ?? answers[q.id] ?? ''
      }
      setAnswers(merged)
      setErrors({})
    } catch (err) {
      if (mountedRef.current) setError(getProfilingErrorMessage(err))
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [sessionId, answers])

  // ---- Tier 1 Navigation ----

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
    setErrors(prev => {
      if (!prev[questionId]) return prev
      const next = { ...prev }
      delete next[questionId]
      return next
    })
  }

  const handleTier1Next = async () => {
    if (!section || !sessionId) return
    if (!validateSection()) return

    // navigating forward clears any previously marked finished state
    setFinished(false)
    const currentIdx = section.section_index
    if (currentIdx >= SECTIONS_ORDER.length - 1) return

    const nextSection = SECTIONS_ORDER[currentIdx + 1]
    setSubmitting(true)

    try {
      if (visibleQuestions.length > 0) {
        const answersBatch = visibleQuestions.map(q => ({
          question_id: q.id,
          answer_value: answers[q.id] ?? ''
        }))
        await profilingApi.submitAnswersBatch(sessionId, {
          answers: answersBatch,
          advance_to_section: nextSection,
        })
      }
      await loadSection(nextSection, 1, 'forward')
    } catch (err) {
      setError(getProfilingErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleTier1Back = async () => {
    if (!section || !sessionId) return
    // navigating back cancels finished state
    setFinished(false)
    const currentIdx = section.section_index
    if (currentIdx <= 0) {
      onCancel()
      return
    }
    const prevSection = SECTIONS_ORDER[currentIdx - 1]
    setLoading(true)
    try {
      if (visibleQuestions.length > 0) {
        const answersBatch = visibleQuestions.map(q => ({
          question_id: q.id,
          answer_value: answers[q.id] ?? ''
        }))
        await profilingApi.submitAnswersBatch(sessionId, {
          answers: answersBatch,
          advance_to_section: prevSection,
        })
      }
      await loadSection(prevSection, 1, 'backward')
    } catch (err) {
      setError(getProfilingErrorMessage(err))
      setLoading(false)
    }
  }

  const handleTier1Finish = async () => {
    if (!section || !sessionId) return
    if (!validateSection()) return

    // mark finished so progress shows 100% immediately while finishing
    setFinished(true)
    setSubmitting(true)
    setError(null)

    try {
      // Save the last section's answers before previewing
      if (visibleQuestions.length > 0) {
        const answersBatch = visibleQuestions.map(q => ({
          question_id: q.id,
          answer_value: answers[q.id] ?? ''
        }))
        await profilingApi.submitAnswersBatch(sessionId, {
          answers: answersBatch,
        })
      }

      const preview = await profilingApi.previewScores(sessionId)
      if (!mountedRef.current) return

      setPreviewScores(preview.scores)

      if (preview.has_high_risk) {
        setPhase('preview')
        const t2 = await profilingApi.getTier2Questions(sessionId)
        if (mountedRef.current) {
          setTier2Questions(t2.questions)
        }
      } else {
        const result = await profilingApi.completeSession(sessionId)
        if (mountedRef.current) onComplete(result)
      }
    } catch (err) {
      if (mountedRef.current) setError(getProfilingErrorMessage(err))
      // revert finished state on error
      if (mountedRef.current) setFinished(false)
    } finally {
      if (mountedRef.current) setSubmitting(false)
    }
  }

  // ---- Preview Phase ----

  const handleSkipToComplete = async () => {
    if (!sessionId) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await profilingApi.completeSession(sessionId)
      onComplete(result)
      if (onSeeRecommendations) {
        onSeeRecommendations(result)
      }
    } catch (err) {
      setError(getProfilingErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartTier2 = async () => {
    if (!sessionId) return
    setSubmitting(true)
    setError(null)
    try {

      if (!mountedRef.current) return
      const t2questions = Array.from(new Map(tier2Questions.map(t => [t.question.id, t.question])).values())
      const tier2Answers = tier2Questions.reduce<Record<string, string>>((acc, t) => {
        if (t.answer_value) acc[t.question.id] = t.answer_value
        return acc
      }, {})
      setAllQuestions(t2questions)
      setSection({
        section: 'refinement',
        section_index: 0,
        total_sections: 1,
        questions: t2questions,
        answers: tier2Answers,
        session: section?.session!,
      })
      setAnswers(prev => ({ ...prev, ...tier2Answers }))
      setErrors({})
      setPhase('tier2')
    } catch (err) {
      if (mountedRef.current) setError(getProfilingErrorMessage(err))
    } finally {
      if (mountedRef.current) setSubmitting(false)
    }
  }

  // ---- Tier 2 (flat list, no section nav) ----

  const handleTier2Finish = async () => {
    if (!sessionId) return
    setSubmitting(true)
    setError(null)
    try {
      const answersToSubmit = tier2Questions
        .filter(t2 => answers[t2.question.id])
        .map(t2 => ({
          question_id: t2.question.id,
          answer_value: answers[t2.question.id],
        }))

      if (answersToSubmit.length > 0) {
        await profilingApi.submitAnswersBatch(sessionId, { answers: answersToSubmit })
      }
      const result = await profilingApi.completeSession(sessionId)
      onComplete(result)
    } catch (err) {
      setError(getProfilingErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  // ---- Render Helpers ----

  const renderTier1Wizard = () => {
    if (loading && !section) {
      return (
        <div className="w-full min-h-[20rem] pb-20">
          <div className="flex min-h-[14rem] flex-col items-center justify-center gap-3 px-0 py-8 text-sm text-text-secondary">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-border border-t-primary" />
            <p>Loading profiling session...</p>
          </div>
        </div>
      )
    }

    if (error && !section) {
      return (
        <div className="w-full min-h-[20rem] pb-20">
          <div className="mb-4 flex items-center justify-between gap-4 rounded-[14px] border border-risk-high bg-risk-high-bg px-3.5 py-3 text-sm text-risk-high">
            <p className="m-0">{error}</p>
            <div className="flex gap-2">
              <button type="button" className="rounded-[var(--radius-md)] border border-risk-high bg-transparent px-3 py-1.5 text-[13px] font-semibold text-risk-high" onClick={() => initSession(1)}>
                Retry
              </button>
              <button type="button" className="rounded-[var(--radius-md)] border border-border bg-transparent px-3 py-1.5 text-[13px] font-semibold text-text-secondary" onClick={onCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (!section) return null

    const currentIdx = section.section_index
    const totalSections = section.total_sections
    // Map progress so the first step shows 0% and the last step shows 100%.
    // When there's only one section, show 100%.
    const progressPct = finished
      ? 100
      : totalSections > 1
      ? (currentIdx / (totalSections - 1)) * 100
      : 0
    const sectionLabel = SECTION_LABELS[section.section] || section.section
    const isFirstSection = currentIdx === 0
    const isLastSection = currentIdx === totalSections - 1

    return (
      <div className="w-full min-h-[20rem] pb-20">
        <header className="mb-4">
          <h1 className="m-0 max-w-[46rem] text-[clamp(2.125rem,3.5vw,2.5rem)] font-extrabold leading-[1.05] tracking-[-0.02em] text-text-primary">Insurance Risk Assessment</h1>
          <p className="mt-2 max-w-[52rem] text-[0.9375rem] font-medium leading-6 text-text-muted">
            Progress through each section at your own pace. Your answers shape the final risk profile and policy recommendations.
          </p>
        </header>

        <div className="mb-5 rounded-[18px] border border-[rgba(20,20,19,0.06)] bg-surface-alt p-4 shadow-[0_14px_40px_rgba(20,20,19,0.045)]">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <span className="block text-[0.9375rem] font-extrabold text-text-primary">{sectionLabel}</span>
              <span className="mt-0.5 block text-[0.8125rem] font-semibold text-text-muted">Step {currentIdx + 1} of {totalSections}</span>
            </div>
            <span className="whitespace-nowrap text-sm font-extrabold text-text-primary">{Math.round(progressPct)}% Complete</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full border border-[rgba(20,20,19,0.06)] bg-surface">
            <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-[14px] border border-risk-high bg-risk-high-bg px-3.5 py-3 text-sm text-risk-high">
            <span>{error}</span>
            <button type="button" className="rounded-[var(--radius-sm)] border border-risk-high bg-transparent px-3 py-1.5 text-[13px] font-semibold text-risk-high" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        <div className="flex flex-col gap-[1.125rem]">
          {loading ? (
            <div className="flex min-h-[14rem] flex-col items-center justify-center gap-3 px-0 py-8 text-sm text-text-secondary">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-border border-t-primary" />
              <p>Loading questions...</p>
            </div>
          ) : (
            visibleQuestions.map(q => (
              <QuestionRenderer
                key={q.id}
                question={q}
                value={answers[q.id] ?? ''}
                onChange={handleAnswerChange}
                error={errors[q.id]}
              />
            ))
          )}
        </div>

        <div className="sticky bottom-0 z-20 mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-[linear-gradient(to_top,var(--color-background)_78%,rgba(243,240,238,0))] py-3">
          <button
            type="button"
            className="justify-self-start rounded-[var(--radius-md)] border border-[rgba(20,20,19,0.1)] bg-surface-alt px-5 py-2.5 text-sm font-bold text-text-primary transition-all hover:-translate-y-0.5 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            onClick={handleTier1Back}
            disabled={submitting || loading}
          >
            {isFirstSection ? 'Cancel' : 'Back'}
          </button>
          <span className="justify-self-center rounded-full border border-[rgba(20,20,19,0.06)] bg-[rgba(252,251,250,0.92)] px-3 py-1.5 text-[13px] font-extrabold text-text-secondary shadow-[0_10px_30px_rgba(20,20,19,0.05)]">Step {currentIdx + 1} of {totalSections}</span>
          {isLastSection ? (
            <button
              type="button"
              className="justify-self-end rounded-[var(--radius-md)] border border-cta bg-cta px-5 py-2.5 text-sm font-bold text-cta-contrast shadow-cta transition-all hover:-translate-y-0.5 hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              onClick={handleTier1Finish}
              disabled={submitting || loading}
            >
              {submitting ? 'Saving...' : 'Finish'}
            </button>
          ) : (
            <button
              type="button"
              className="justify-self-end rounded-[var(--radius-md)] border border-cta bg-cta px-5 py-2.5 text-sm font-bold text-cta-contrast shadow-cta transition-all hover:-translate-y-0.5 hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              onClick={handleTier1Next}
              disabled={submitting || loading}
            >
              {submitting ? 'Saving...' : 'Next'}
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderPreview = () => {
    const filteredScores = previewScores
      .filter(s => s.score > 0.2)
      .sort((a, b) => (RISK_WEIGHTS[b.risk_level] || 0) - (RISK_WEIGHTS[a.risk_level] || 0))

    const hasHighRisk = filteredScores.some(s => s.risk_level === 'high' || s.risk_level === 'critical')

    return (
      <div className="w-full max-w-[1180px]">
        <div className="mb-5">
          <h2 className="m-0 mb-2.5 text-[clamp(1.75rem,2.4vw,2.125rem)] font-extrabold leading-[1.15] tracking-[-0.02em] text-text-primary">Your Risk Assessment Results</h2>
          <p className="m-0 max-w-[42rem] text-[0.9375rem] font-semibold leading-6 text-text-secondary">
            Based on your answers, here is your preliminary risk profile
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-[14px] border border-risk-high bg-risk-high-bg px-3.5 py-3 text-sm text-risk-high">
            <span>{error}</span>
            <button type="button" className="rounded-[var(--radius-sm)] border border-risk-high bg-transparent px-3 py-1.5 text-[13px] font-semibold text-risk-high" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        {filteredScores.length > 0 ? (
          <div className="mb-4 flex flex-col gap-3">
            {filteredScores.map(s => (
              <div
                key={s.risk_category_name}
                className={`grid min-h-[4rem] items-center gap-4 rounded-[18px] border border-[rgba(20,20,19,0.08)] bg-surface-alt px-4 py-3.5 shadow-[0_14px_40px_rgba(20,20,19,0.04)] md:grid-cols-[minmax(0,1fr)_auto_auto] ${s.risk_level === 'high' || s.risk_level === 'critical' ? 'border-[rgba(220,38,38,0.28)] bg-risk-high-bg' : ''}`}
              >
                <span className="text-base font-extrabold text-text-primary">{s.risk_category_name}</span>
                <span className={`rounded-full px-2.5 py-1 text-[13px] font-extrabold uppercase ${s.risk_level === 'critical' || s.risk_level === 'high' ? 'bg-risk-high-bg text-risk-high' : s.risk_level === 'medium' ? 'bg-risk-medium-bg text-risk-medium' : 'bg-risk-low-bg text-risk-low'}`}>
                  {s.risk_level.toUpperCase()}
                </span>
                <span className="text-right text-[1.5rem] font-extrabold text-text-primary md:text-left">{Math.round(s.score * 100)}%</span>
                {s.has_tier2_questions && (
                  <span className="md:col-span-3 text-[13px] font-bold text-secondary">Refinement available</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-6 text-[0.9375rem] font-semibold text-text-secondary">
            Excellent! All your risk categories are below 20%. No significant risks detected.
          </p>
        )}

        {hasHighRisk && uniqueT2Questions.length > 0 && (
          <div className="rounded-[18px] border border-[rgba(20,20,19,0.08)] bg-surface-alt p-4 shadow-[0_14px_40px_rgba(20,20,19,0.04)]">
            <p className="m-0 mb-3 text-sm leading-6 text-text-primary">
              We found <strong>areas</strong> that need closer attention. Answer <strong>{uniqueT2Questions.length} more question{uniqueT2Questions.length !== 1 ? 's' : ''}</strong>{' '}for a more precise assessment.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                className="inline-flex min-h-[2.5rem] items-center justify-center rounded-[var(--radius-md)] border border-cta bg-cta px-4 py-2 text-sm font-bold text-cta-contrast transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleStartTier2}
                disabled={submitting}
              >
                {submitting ? 'Loading...' : `Refine Assessment (${uniqueT2Questions.length} questions)`}
              </button>
              <button
                type="button"
                className="inline-flex min-h-[2.5rem] items-center justify-center rounded-[var(--radius-md)] border border-[rgba(20,20,19,0.1)] bg-surface-alt px-4 py-2 text-sm font-bold text-text-primary transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleSkipToComplete}
                disabled={submitting}
              >
                Skip to Recommendations
              </button>
            </div>
          </div>
        )}

        {!hasHighRisk && (
          <div className="rounded-[18px] border border-[rgba(20,20,19,0.08)] bg-surface-alt p-4 shadow-[0_14px_40px_rgba(20,20,19,0.04)]">
            <p className="m-0 mb-3 text-sm leading-6 text-text-primary">
              All risk categories are at a Low or Medium level. Your recommendations are ready.
            </p>
            <button
              type="button"
              className="inline-flex min-h-[2.5rem] items-center justify-center rounded-[var(--radius-md)] border border-cta bg-cta px-4 py-2 text-sm font-bold text-cta-contrast transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleSkipToComplete}
              disabled={submitting}
            >
              {submitting ? 'Loading...' : 'View Recommendations'}
            </button>
          </div>
        )}
      </div>
    )
  }

  const renderTier2Wizard = () => {
    const questions = allQuestions.length > 0 ? allQuestions : uniqueT2Questions
    const categories = Array.from(new Set(tier2Questions.map(t => t.risk_category_name)))

    return (
      <div className="w-full min-h-[20rem] pb-20">
        <header className="mb-4">
          <h1 className="m-0 text-[clamp(2.125rem,3.5vw,2.5rem)] font-extrabold leading-[1.05] tracking-[-0.02em] text-text-primary">Precision Refinement</h1>
          <p className="mt-2 text-[0.9375rem] font-semibold leading-6 text-text-secondary">
            Answer {questions.length} more question{questions.length !== 1 ? 's' : ''} to refine your risk scores
          </p>
        </header>

        {error && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-[14px] border border-risk-high bg-risk-high-bg px-3.5 py-3 text-sm text-risk-high">
            <span>{error}</span>
            <button type="button" className="rounded-[var(--radius-sm)] border border-risk-high bg-transparent px-3 py-1.5 text-[13px] font-semibold text-risk-high" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        <div className="flex flex-col gap-[1.125rem]">
          {categories.length > 0 && (
            <div className="flex min-h-auto flex-wrap items-center gap-2 text-sm font-bold text-text-primary">
              Refining: {categories.map(cat => (
                <span key={cat} className="inline-block rounded-full bg-risk-high-bg px-2.5 py-1 text-[13px] font-bold text-risk-high">{cat}</span>
              ))}
            </div>
          )}
          {questions.map(q => (
            <QuestionRenderer
              key={q.id}
              question={q}
              value={answers[q.id] ?? ''}
              onChange={handleAnswerChange}
              error={errors[q.id]}
            />
          ))}
        </div>

        <div className="sticky bottom-0 z-20 mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-[linear-gradient(to_top,var(--color-background)_78%,rgba(243,240,238,0))] py-3">
          <button
            type="button"
            className="justify-self-start rounded-[var(--radius-md)] border border-[rgba(20,20,19,0.1)] bg-surface-alt px-5 py-2.5 text-sm font-bold text-text-primary transition-all hover:-translate-y-0.5 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleSkipToComplete}
            disabled={submitting}
          >
            Skip
          </button>
          <span className="justify-self-center rounded-full border border-[rgba(20,20,19,0.06)] bg-[rgba(252,251,250,0.92)] px-3 py-1.5 text-[13px] font-extrabold text-text-secondary shadow-[0_10px_30px_rgba(20,20,19,0.05)]">{questions.length} follow-up question{questions.length !== 1 ? 's' : ''}</span>
          <button
            type="button"
            className="justify-self-end rounded-[var(--radius-md)] border border-cta bg-cta px-5 py-2.5 text-sm font-bold text-cta-contrast shadow-cta transition-all hover:-translate-y-0.5 hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleTier2Finish}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Get Final Results'}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'tier1') return renderTier1Wizard()
  if (phase === 'preview') return renderPreview()
  if (phase === 'tier2') return renderTier2Wizard()
  return null
}
