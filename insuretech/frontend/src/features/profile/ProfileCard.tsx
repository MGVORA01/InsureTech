import type { BusinessProfile } from './profile.types'
import styles from './ProfileCard.module.css'

function IconBuilding() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <line x1="8" y1="6" x2="10" y2="6" />
      <line x1="8" y1="10" x2="10" y2="10" />
      <line x1="8" y1="14" x2="10" y2="14" />
      <line x1="14" y1="6" x2="16" y2="6" />
      <line x1="14" y1="10" x2="16" y2="10" />
      <line x1="14" y1="14" x2="16" y2="14" />
    </svg>
  )
}

function IconIndustry() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function IconMapPin() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function IconFlag() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  )
}

function IconPackage() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconCurrency() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

interface ProfileCardProps {
  profile: BusinessProfile
}

export default function ProfileCard({ profile }: ProfileCardProps) {
  const fields: { label: string; value: string | number | null | undefined; Icon: () => JSX.Element }[] = [
    { label: 'Segment', value: profile.segment?.name ?? profile.segment_id, Icon: IconBuilding },
    { label: 'Industry', value: profile.industry?.name ?? profile.industry_id, Icon: IconIndustry },
    { label: 'City', value: profile.city, Icon: IconMapPin },
    { label: 'State', value: profile.state, Icon: IconFlag },
    { label: 'Pincode', value: profile.pincode, Icon: IconPackage },
    { label: 'Year Est.', value: profile.year_established, Icon: IconCalendar },
    { label: 'Employees', value: profile.employee_count, Icon: IconUsers },
    { label: 'Turnover', value: profile.annual_turnover_range, Icon: IconCurrency },
  ]

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.avatar}>
          {profile.business_name.slice(0, 2).toUpperCase()}
        </span>
        <div className={styles.headerInfo}>
          <h2 className={styles.title}>{profile.business_name}</h2>
          <p className={styles.subtitle}>
            {[profile.industry?.name, profile.segment?.name].filter(Boolean).join(' \u00B7 ')}
          </p>
          {(profile.city || profile.state) && (
            <p className={styles.location}>
              {[profile.city, profile.state].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
        <span
          className={styles.badge}
          style={{
            background: profile.is_active ? 'var(--color-risk-low-bg)' : 'var(--color-risk-medium-bg)',
            color: profile.is_active ? 'var(--color-risk-low)' : 'var(--color-risk-medium)',
            borderColor: profile.is_active ? 'var(--color-risk-low-bg)' : 'var(--color-risk-medium-bg)',
          }}
        >
          {profile.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {profile.business_description && (
        <p className={styles.description}>{profile.business_description}</p>
      )}

      <p className={styles.sectionTitle}>Business Information</p>

      <div className={styles.grid}>
        {fields.map(({ label, value, Icon }) =>
          value ? (
            <div className={styles.field} key={label}>
              <span className={styles.fieldIcon}>
                <Icon />
              </span>
              <div className={styles.fieldContent}>
                <span className={styles.fieldLabel}>{label}</span>
                <span className={styles.fieldValue}>{value}</span>
              </div>
            </div>
          ) : null,
        )}
      </div>
    </div>
  )
}
