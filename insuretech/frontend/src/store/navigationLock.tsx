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
  setActiveBusiness: (businessId: string | null | undefined) => void
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
  setActiveBusiness: () => {},
})

export function NavigationLockProvider({ children }: { children: React.ReactNode }) {
  const user = useSelector(selectAuthUser)
  const userKey = user?.id ?? 'anon'

  const [businessId, setBusinessId] = useState<string | null>(null)
  const [state, setState] = useState<NavState>(defaultState)

  const storage = typeof window !== 'undefined' && userKey === 'anon' ? window.sessionStorage : window.localStorage
  const storageKey = `${STORAGE_KEY}:${userKey}:${businessId ?? '__none__'}`

  useEffect(() => {
    try {
      const raw = storage.getItem(storageKey)
      if (raw) {
        setState(JSON.parse(raw) as NavState)
        return
      }
    } catch {
      // ignore
    }
    setState(defaultState)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  useEffect(() => {
    try {
      storage.setItem(storageKey, JSON.stringify(state))
    } catch {
      // ignore
    }
  }, [state, storageKey, storage])

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

  const setActiveBusiness = useCallback((nextBusinessId: string | null | undefined) => {
    setBusinessId((prev) => (nextBusinessId === prev ? prev : (nextBusinessId ?? null)))
  }, [])

  return (
    <NavigationLockContext.Provider
      value={{ ...state, unlockRecommendation, unlockComparison, unlockChatbot, reset, setActiveBusiness }}
    >
      {children}
    </NavigationLockContext.Provider>
  )
}

export function useNavigationLock() {
  return useContext(NavigationLockContext)
}

export default NavigationLockContext
