import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { BusinessProfile, CreateBusinessRequest, Segment, Industry } from './profile.types'
import { TURNOVER_RANGES } from './profile.constants'
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
      address: '',
      pincode: '',
      annual_turnover_range: '',
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
        city: values.city || undefined,
        state: values.state || undefined,
        address: values.address || undefined,
        pincode: values.pincode || undefined,
        year_established: values.year_established || undefined,
        employee_count: values.employee_count || undefined,
        annual_turnover_range: values.annual_turnover_range || undefined,
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
            City <span className={styles.optional}>(optional)</span>
          </label>
          <input id="city" type="text" className={styles.input} {...register('city')} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="state">
            State <span className={styles.optional}>(optional)</span>
          </label>
          <input id="state" type="text" className={styles.input} {...register('state')} />
        </div>
      </div>

      {/* Address */}
      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="address">
          Address <span className={styles.optional}>(optional)</span>
        </label>
        <textarea id="address" className={styles.textarea} {...register('address')} />
      </div>

      {/* Pincode */}
      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="pincode">
          Pincode <span className={styles.optional}>(optional)</span>
        </label>
        <input id="pincode" type="text" className={styles.input} {...register('pincode')} />
      </div>

      {/* Year Established + Employees */}
      <div className={styles.row}>
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="year_established">
            Year Established <span className={styles.optional}>(optional)</span>
          </label>
          <input
            id="year_established"
            type="number"
            className={styles.input}
            {...register('year_established')}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="employee_count">
            Employees <span className={styles.optional}>(optional)</span>
          </label>
          <input
            id="employee_count"
            type="number"
            className={styles.input}
            {...register('employee_count')}
          />
        </div>
      </div>

      {/* Turnover Range */}
      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="annual_turnover_range">
          Annual Turnover <span className={styles.optional}>(optional)</span>
        </label>
        <select
          id="annual_turnover_range"
          className={styles.select}
          {...register('annual_turnover_range')}
        >
          <option value="">Select turnover range</option>
          {TURNOVER_RANGES.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>
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
