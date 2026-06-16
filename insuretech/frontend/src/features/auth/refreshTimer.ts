import type { AppDispatch } from '../../store/store'
import { AUTH_REFRESH_INTERVAL_MS } from './auth.constants'
import { refreshToken } from './authSlice'

export type RefreshTimerHandle = ReturnType<typeof window.setInterval>

export function startRefreshTimer(
  dispatch: AppDispatch,
  intervalMs = AUTH_REFRESH_INTERVAL_MS,
): RefreshTimerHandle | null {
  if (typeof window === 'undefined') {
    return null
  }

  return window.setInterval(() => {
    // TODO: Enable this timer after POST /api/auth/refresh is implemented.
    // dispatch(refreshToken())
    void dispatch
    void refreshToken
  }, intervalMs)
}

export function stopRefreshTimer(timer: RefreshTimerHandle | null) {
  if (timer) {
    window.clearInterval(timer)
  }
}
