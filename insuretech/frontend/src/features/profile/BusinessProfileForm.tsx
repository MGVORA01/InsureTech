import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { BusinessProfile, CreateBusinessRequest, Segment, Industry } from './profile.types'
import { profileApi, getProfileErrorMessage } from './profileApi'
import { businessProfileSchema, type BusinessProfileFormValues } from './validation/businessProfile.schema'

interface BusinessProfileFormProps {
  onSuccess: (profile: BusinessProfile) => void
}

export default function BusinessProfileForm({ onSuccess }: BusinessProfileFormProps) {
  const [segments, setSegments] = useState<Segment[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
  const [loading, setLoading] = useState(false)
  const [segmentsLoading, setSegmentsLoading] = useState(true)
  const [industriesLoading, setIndustriesLoading] = useState(false)
  const [segmentsError, setSegmentsError] = useState<string | null>(null)
  const [industriesError, setIndustriesError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BusinessProfileFormValues>({
    resolver: zodResolver(businessProfileSchema) as any,
    defaultValues: {
      segment_id: '',
      industry_id: '',
      business_name: '',
      business_description: '',
      city: '',
      state: '',
    },
  })

  const selectedSegmentId = watch('segment_id')

  const loadSegments = useCallback(async () => {
    setSegmentsLoading(true)
    setSegmentsError(null)
    try {
      const data = await profileApi.getSegments()
      setSegments(data)
    } catch (err) {
      setSegmentsError(getProfileErrorMessage(err))
    } finally {
      setSegmentsLoading(false)
    }
  }, [])

  const loadIndustries = useCallback(async (segmentId: string) => {
    setIndustriesLoading(true)
    setIndustriesError(null)
    try {
      const data = await profileApi.getIndustries(segmentId)
      setIndustries(data)
    } catch (err) {
      setIndustriesError(getProfileErrorMessage(err))
    } finally {
      setIndustriesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSegments()
  }, [loadSegments])

  useEffect(() => {
    setValue('industry_id', '')
    setIndustries([])

    if (selectedSegmentId) {
      loadIndustries(selectedSegmentId)
    }
  }, [selectedSegmentId, loadIndustries, setValue])

  const onSubmit = async (values: BusinessProfileFormValues) => {
    setLoading(true)
    setSubmitError(null)

    try {
      const payload: CreateBusinessRequest = {
        segment_id: values.segment_id,
        industry_id: values.industry_id,
        business_name: values.business_name,
        business_description: values.business_description || undefined,
        city: values.city ,
        state: values.state ,
      }

      const profile = await profileApi.createBusiness(payload)
      onSuccess(profile)
    } catch (err) {
      setSubmitError(getProfileErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit as any)} noValidate>
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-text-primary" htmlFor="segment_id">
          Segment
        </label>
        {segmentsError ? (
          <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-risk-high bg-risk-high-bg px-3 py-2 text-[13px] text-risk-high">
            <span>{segmentsError}</span>
            <button type="button" className="rounded-[var(--radius-sm)] border border-risk-high bg-transparent px-2.5 py-1 text-[12px] font-medium text-risk-high" onClick={loadSegments}>
              Retry
            </button>
          </div>
        ) : (
          <select
            id="segment_id"
            className="w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-primary focus:shadow-[0_0_0_2px_var(--focus-ring-secondary-soft)] disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-text-tertiary"
            disabled={segmentsLoading}
            {...register('segment_id')}
          >
            <option value="">
              {segmentsLoading ? 'Loading segments...' : 'Select a segment'}
            </option>
            {segments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        {errors.segment_id && <span className="text-[12px] text-risk-high">{errors.segment_id.message}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-text-primary" htmlFor="industry_id">
          Industry
        </label>
        {industriesError ? (
          <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-risk-high bg-risk-high-bg px-3 py-2 text-[13px] text-risk-high">
            <span>{industriesError}</span>
            <button
              type="button"
              className="rounded-[var(--radius-sm)] border border-risk-high bg-transparent px-2.5 py-1 text-[12px] font-medium text-risk-high"
              onClick={() => selectedSegmentId && loadIndustries(selectedSegmentId)}
            >
              Retry
            </button>
          </div>
        ) : (
          <select
            id="industry_id"
            className="w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-primary focus:shadow-[0_0_0_2px_var(--focus-ring-secondary-soft)] disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-text-tertiary"
            disabled={!selectedSegmentId || industriesLoading}
            {...register('industry_id')}
          >
            <option value="">
              {!selectedSegmentId
                ? 'Select a segment first'
                : industriesLoading
                  ? 'Loading industries...'
                  : 'Select an industry'}
            </option>
            {industries.map((ind) => (
              <option key={ind.id} value={ind.id}>
                {ind.name}
              </option>
            ))}
          </select>
        )}
        {errors.industry_id && <span className="text-[12px] text-risk-high">{errors.industry_id.message}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-text-primary" htmlFor="business_name">
          Business Name
        </label>
        <input
          id="business_name"
          type="text"
          className="w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-primary focus:shadow-[0_0_0_2px_var(--focus-ring-secondary-soft)]"
          {...register('business_name')}
        />
        {errors.business_name && <span className="text-[12px] text-risk-high">{errors.business_name.message}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-text-primary" htmlFor="business_description">
          Description <span className="ml-1 font-normal text-text-tertiary">(optional)</span>
        </label>
        <textarea
          id="business_description"
          className="min-h-16 w-full resize-y rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-primary focus:shadow-[0_0_0_2px_var(--focus-ring-secondary-soft)]"
          {...register('business_description')}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-text-primary" htmlFor="city">
            City
          </label>
          <input id="city" type="text" className="w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-primary focus:shadow-[0_0_0_2px_var(--focus-ring-secondary-soft)]" {...register('city')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-text-primary" htmlFor="state">
            State
          </label>
          <input id="state" type="text" className="w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-primary focus:shadow-[0_0_0_2px_var(--focus-ring-secondary-soft)]" {...register('state')} />
        </div>
      </div>

      {submitError && (
        <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-risk-high bg-risk-high-bg px-3 py-2 text-[13px] text-risk-high">
          <span>{submitError}</span>
          <button
            type="button"
            className="rounded-[var(--radius-sm)] border border-risk-high bg-transparent px-2.5 py-1 text-[12px] font-medium text-risk-high"
            onClick={handleSubmit(onSubmit as any)}
          >
            Retry
          </button>
        </div>
      )}

      <button type="submit" className="w-full rounded-[var(--radius-md)] bg-primary px-4 py-2.5 text-sm font-semibold text-text-onPrimary transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60" disabled={loading}>
        {loading ? 'Creating...' : 'Create Profile'}
      </button>
    </form>
  )
}
