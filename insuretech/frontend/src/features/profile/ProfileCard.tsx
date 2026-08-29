import type { SVGProps } from 'react'
import type { BusinessProfile } from './profile.types'

type IconProps = SVGProps<SVGSVGElement>

function IconBuilding(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h2M8 10h2M8 14h2M14 6h2M14 10h2M14 14h2" />
    </svg>
  )
}

function IconIndustry(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 21h18" />
      <path d="M5 21V9l6 4V9l6 4V5h3v16" />
    </svg>
  )
}

function IconMapPin(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 1 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function IconFlag(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 22V4" />
      <path d="M5 4s2-1 5-1 5 2 8 2 4-1 4-1v11s-1 1-4 1-5-2-8-2-5 1-5 1" />
    </svg>
  )
}

function IconPencil(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="M15 5l4 4" />
    </svg>
  )
}

interface ProfileCardProps {
  profile: BusinessProfile
  onEdit?: () => void
}

function displayValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return 'Not provided'
  return value
}

export default function ProfileCard({ profile, onEdit }: ProfileCardProps) {
  const fields = [
    { label: 'Industry', value: displayValue(profile.industry?.name ?? profile.industry_id), Icon: IconIndustry, accent: '#CF4500' },
    { label: 'Segment', value: displayValue(profile.segment?.name ?? profile.segment_id), Icon: IconBuilding, accent: '#3860BE' },
    { label: 'City', value: displayValue(profile.city), Icon: IconMapPin, accent: '#7C3AED' },
    { label: 'State', value: displayValue(profile.state), Icon: IconFlag, accent: '#059669' },
  ]

  return (
    <section className="rounded-[18px] border border-black/5 bg-white shadow-[0_14px_40px_rgba(20,20,19,0.045)]">
      <div className="flex items-center justify-between gap-4 border-b border-black/5 px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
            <IconBuilding className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-[20px] font-bold tracking-tight text-gray-950">Business Information</h2>
            <p className="mt-0.5 text-[13px] font-medium text-gray-500">Core profile details used across your account</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              title="Edit business profile"
            >
              <IconPencil className="h-5 w-5" />
            </button>
          )}
          <span className="rounded-full bg-gray-100 px-3 py-1.5 text-[12px] font-bold text-gray-700">
            {profile.is_active ? 'Active profile' : 'Inactive profile'}
          </span>
        </div>
      </div>

      <div className="grid gap-px bg-black/[0.04] p-px sm:grid-cols-2 xl:grid-cols-4">
        {fields.map(({ label, value, Icon, accent }) => (
          <div key={label} className="flex min-h-[104px] items-start gap-3 bg-white p-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${accent}12`, color: accent }}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400">{label}</p>
              <p className="mt-1.5 break-words text-[18px] font-bold leading-6 text-gray-950">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
