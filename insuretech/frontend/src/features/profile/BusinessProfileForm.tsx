import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { BusinessProfile, CreateBusinessRequest, Segment, Industry } from './profile.types'
import { profileApi, getProfileErrorMessage } from './profileApi'
import { businessProfileSchema, type BusinessProfileFormValues } from './validation/businessProfile.schema'
import styles from './BusinessProfileForm.module.css'

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
    <form className={styles.form} onSubmit={handleSubmit(onSubmit as any)} noValidate>
      {/* Segments */}
      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="segment_id">
          Segment
        </label>
        {segmentsError ? (
          <div className={styles.banner}>
            <span>{segmentsError}</span>
            <button type="button" className={styles.retryBtn} onClick={loadSegments}>
              Retry
            </button>
          </div>
        ) : (
          <select
            id="segment_id"
            className={styles.select}
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
        {errors.segment_id && <span className={styles.error}>{errors.segment_id.message}</span>}
      </div>

      {/* Industries */}
      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="industry_id">
          Industry
        </label>
        {industriesError ? (
          <div className={styles.banner}>
            <span>{industriesError}</span>
            <button
              type="button"
              className={styles.retryBtn}
              onClick={() => selectedSegmentId && loadIndustries(selectedSegmentId)}
            >
              Retry
            </button>
          </div>
        ) : (
          <select
            id="industry_id"
            className={styles.select}
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
        {errors.industry_id && <span className={styles.error}>{errors.industry_id.message}</span>}
      </div>

      {/* Business Name */}
      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="business_name">
          Business Name
        </label>
        <input
          id="business_name"
          type="text"
          className={styles.input}
          {...register('business_name')}
        />
        {errors.business_name && <span className={styles.error}>{errors.business_name.message}</span>}
      </div>

      {/* Business Description */}
      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="business_description">
          Description <span className={styles.optional}>(optional)</span>
        </label>
        <textarea
          id="business_description"
          className={styles.textarea}
          {...register('business_description')}
        />
      </div>

      {/* City + State */}
      <div className={styles.row}>
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="city">
            City 
          </label>
          <input id="city" type="text" className={styles.input} {...register('city')} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="state">
            State 
          </label>
          <input id="state" type="text" className={styles.input} {...register('state')} />
        </div>
      </div>

      {/* Submit Error */}
      {submitError && (
        <div className={styles.banner}>
          <span>{submitError}</span>
          <button
            type="button"
            className={styles.retryBtn}
            onClick={handleSubmit(onSubmit as any)}
          >
            Retry
          </button>
        </div>
      )}

      {/* Submit */}
      <button type="submit" className={styles.submitBtn} disabled={loading}>
        {loading ? 'Creating...' : 'Create Profile'}
      </button>
    </form>
  )
}
