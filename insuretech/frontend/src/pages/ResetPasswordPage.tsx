import ResetPasswordForm from '../features/auth/ResetPasswordForm'
import styles from '../features/auth/ResetPasswordPage.module.css'

function ResetPasswordPage() {
  return (
      <div className={styles.card}>
        <ResetPasswordForm />
    </div>
  )
}

export default ResetPasswordPage
