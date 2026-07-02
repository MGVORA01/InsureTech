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
import styles from './ProfilingWizard.module.css'

interface ProfilingWizardProps {
  onComplete: (data: ProfilingCompleteOut) => void
  onCancel: () => void
  businessId?: string
}

const RISK_WEIGHTS: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

export default function ProfilingWizard({ onComplete, onCancel, businessId }: ProfilingWizardProps) {
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
        } else if (direction === 'backward' && result.section_index > 0) {
          const prevTarget = SECTIONS_ORDER[result.section_index - 1]
          await loadSection(prevTarget, tier, direction)
          return
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
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading profiling session...</p>
          </div>
        </div>
      )
    }

    if (error && !section) {
      return (
        <div className={styles.container}>
          <div className={styles.errorBanner}>
            <p>{error}</p>
            <button type="button" className={styles.retryBtn} onClick={() => initSession(1)}>
              Retry
            </button>
            <button type="button" className={styles.cancelBtn} onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      )
    }

    if (!section) return null

    const currentIdx = section.section_index
    const totalSections = section.total_sections
    const progressPct = ((currentIdx + 1) / totalSections) * 100
    const sectionLabel = SECTION_LABELS[section.section] || section.section
    const isFirstSection = currentIdx === 0
    const isLastSection = currentIdx === totalSections - 1

    return (
      <div className={styles.container}>
        <header className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Insurance Risk Assessment</h1>
          <p className={styles.pageSubtitle}>
            Progress through each section at your own pace. Your answers shape the final risk profile and policy recommendations.
          </p>
        </header>

        <div className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <div>
              <span className={styles.sectionLabel}>{sectionLabel}</span>
              <span className={styles.progressCount}>Step {currentIdx + 1} of {totalSections}</span>
            </div>
            <span className={styles.progressPercent}>{Math.round(progressPct)}% Complete</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <span>{error}</span>
            <button type="button" className={styles.retryBtn} onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        <div className={styles.questionsSection}>
          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
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

        <div className={styles.nav}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={handleTier1Back}
            disabled={submitting || loading}
          >
            {isFirstSection ? 'Cancel' : 'Back'}
          </button>
          <span className={styles.navProgress}>Step {currentIdx + 1} of {totalSections}</span>
          {isLastSection ? (
            <button
              type="button"
              className={styles.finishBtn}
              onClick={handleTier1Finish}
              disabled={submitting || loading}
            >
              {submitting ? 'Saving...' : 'Finish'}
            </button>
          ) : (
            <button
              type="button"
              className={styles.nextBtn}
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
      <div className={`${styles.container} ${styles.previewContainer}`}>
        <div className={styles.previewHeader}>
          <h2 className={styles.previewTitle}>Your Risk Assessment Results</h2>
          <p className={styles.previewSubtitle}>
            Based on your answers, here is your preliminary risk profile
          </p>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <span>{error}</span>
            <button type="button" className={styles.retryBtn} onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        {filteredScores.length > 0 ? (
          <div className={styles.scoreGrid}>
            {filteredScores.map(s => (
              <div
                key={s.risk_category_name}
                className={`${styles.scoreCard} ${s.risk_level === 'high' || s.risk_level === 'critical' ? styles.scoreCardHigh : ''}`}
              >
                <span className={styles.scoreCardName}>{s.risk_category_name}</span>
                <span className={`${styles.scoreCardLevel} ${styles[`level${s.risk_level.charAt(0).toUpperCase() + s.risk_level.slice(1)}` as keyof typeof styles] || ''}`}>
                  {s.risk_level.toUpperCase()}
                </span>
                <span className={styles.scoreCardValue}>{Math.round(s.score * 100)}%</span>
                {s.has_tier2_questions && (
                  <span className={styles.scoreCardTag}>Refinement available</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.previewSubtitle} style={{ marginBottom: '1.5rem' }}>
            Excellent! All your risk categories are below 20%. No significant risks detected.
          </p>
        )}

        {hasHighRisk && uniqueT2Questions.length > 0 && (
          <div className={styles.refinePrompt}>
            <p className={styles.refineText}>
              We found <strong>areas</strong> that
              need closer attention.
              Answer <strong>{uniqueT2Questions.length} more question{uniqueT2Questions.length !== 1 ? 's' : ''}</strong>
              {' '}for a more precise assessment.
            </p>
            <div className={styles.refineActions}>
              <button
                type="button"
                className={styles.refineBtn}
                onClick={handleStartTier2}
                disabled={submitting}
              >
                {submitting ? 'Loading...' : `Refine Assessment (${uniqueT2Questions.length} questions)`}
              </button>
              <button
                type="button"
                className={styles.skipBtn}
                onClick={handleSkipToComplete}
                disabled={submitting}
              >
                Skip to Recommendations
              </button>
            </div>
          </div>
        )}

        {!hasHighRisk && (
          <div className={styles.refinePrompt}>
            <p className={styles.refineText}>
              All risk categories are at a Low or Medium level. Your recommendations are ready.
            </p>
            <button
              type="button"
              className={styles.refineBtn}
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
      <div className={styles.container}>
        <header className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Precision Refinement</h1>
          <p className={styles.tier2Subtitle}>
            Answer {questions.length} more question{questions.length !== 1 ? 's' : ''} to refine your risk scores
          </p>
        </header>

        {error && (
          <div className={styles.errorBanner}>
            <span>{error}</span>
            <button type="button" className={styles.retryBtn} onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        <div className={styles.questionsSection}>
          {categories.length > 0 && (
            <div className={styles.tier2Context}>
              Refining: {categories.map(cat => (
                <span key={cat} className={styles.tier2CatTag}>{cat}</span>
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

        <div className={styles.nav}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={handleSkipToComplete}
            disabled={submitting}
          >
            Skip
          </button>
          <span className={styles.navProgress}>{questions.length} follow-up question{questions.length !== 1 ? 's' : ''}</span>
          <button
            type="button"
            className={styles.finishBtn}
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
