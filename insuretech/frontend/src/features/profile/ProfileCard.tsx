import type { BusinessProfile } from './profile.types'
import styles from './ProfileCard.module.css'

interface ProfileCardProps {
  profile: BusinessProfile
}

export default function ProfileCard({ profile }: ProfileCardProps) {
  const fields: { label: string; value: string | number | null | undefined }[] = [
    { label: 'Segment', value: profile.segment?.name ?? profile.segment_id },
    { label: 'Industry', value: profile.industry?.name ?? profile.industry_id },
    { label: 'City', value: profile.city },
    { label: 'State', value: profile.state },
    { label: 'Pincode', value: profile.pincode },
    { label: 'Year Est.', value: profile.year_established },
    { label: 'Employees', value: profile.employee_count },
    { label: 'Turnover', value: profile.annual_turnover_range },
  ]

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>{profile.business_name}</h2>
        <span className={styles.badge}>Active</span>
      </div>
      {profile.business_description && (
        <p className={styles.description}>{profile.business_description}</p>
      )}
      <div className={styles.grid}>
        {fields.map((f) =>
          f.value ? (
            <div className={styles.field} key={f.label}>
              <span className={styles.fieldLabel}>{f.label}</span>
              <span className={styles.fieldValue}>{f.value}</span>
            </div>
          ) : null,
        )}
      </div>
    </div>
  )
}
