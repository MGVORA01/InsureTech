import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { selectAuthUser } from '../features/auth/authSlice'

type NavState = {
  recommendationUnlocked: boolean
  comparisonUnlocked: boolean
  chatbotUnlocked: boolean
}

type NavActions = {
  unlockRecommendation: () => void
  unlockComparison: () => void
  unlockChatbot: () => void
  reset: () => void
}

const STORAGE_KEY = 'insuretech:navLocks:v1'

const defaultState: NavState = {
  recommendationUnlocked: false,
  comparisonUnlocked: false,
  chatbotUnlocked: false,
}

const NavigationLockContext = createContext<NavState & NavActions>({
  ...defaultState,
  unlockRecommendation: () => {},
  unlockComparison: () => {},
  unlockChatbot: () => {},
  reset: () => {},
})

export function NavigationLockProvider({ children }: { children: React.ReactNode }) {
  const user = useSelector(selectAuthUser)
  const userKey = user?.id ?? 'anon'

  const [state, setState] = useState<NavState>(defaultState)

  // Choose storage: persistent for logged-in users, session-only for anonymous users
  const storage = typeof window !== 'undefined' && userKey === 'anon' ? window.sessionStorage : window.localStorage

  // Load per-user state when userKey changes
  useEffect(() => {
    try {
      const raw = storage.getItem(`${STORAGE_KEY}:${userKey}`)
      if (raw) {
        setState(JSON.parse(raw) as NavState)
        return
      }
    } catch {
      // ignore
    }
    setState(defaultState)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userKey])

  // Persist per-user state
  useEffect(() => {
    try {
      storage.setItem(`${STORAGE_KEY}:${userKey}`, JSON.stringify(state))
    } catch {
      // ignore
    }
  }, [state, userKey, storage])

  const unlockRecommendation = useCallback(() => {
    setState((s) => ({ ...s, recommendationUnlocked: true }))
  }, [])

  const unlockComparison = useCallback(() => {
    setState((s) => ({ ...s, comparisonUnlocked: true }))
  }, [])

  const unlockChatbot = useCallback(() => {
    setState((s) => ({ ...s, chatbotUnlocked: true }))
  }, [])

  const reset = useCallback(() => setState(defaultState), [])

  return (
    <NavigationLockContext.Provider value={{ ...state, unlockRecommendation, unlockComparison, unlockChatbot, reset }}>
      {children}
    </NavigationLockContext.Provider>
  )
}

export function useNavigationLock() {
  return useContext(NavigationLockContext)
}

export default NavigationLockContext
