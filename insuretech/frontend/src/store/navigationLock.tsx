import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { selectAuthUser } from '../features/auth/authSlice'
import sessionStore from './sessionStore'

type NavState = {
  recommendationUnlocked: boolean
  comparisonUnlocked: boolean
  chatbotUnlocked: boolean
  isRiskAssessmentCompleted: boolean
}

type NavActions = {
  unlockRecommendation: () => void
  unlockComparison: () => void
  unlockChatbot: () => void
  lockChatbot: () => void
  setRiskAssessmentCompleted: (completed: boolean) => void
  reset: () => void
  setActiveBusiness: (businessId: string | null | undefined) => void
}

const STORAGE_KEY = 'insuretech:navLocks:v1'

const defaultState: NavState = {
  recommendationUnlocked: false,
  comparisonUnlocked: false,
  chatbotUnlocked: false,
  isRiskAssessmentCompleted: false,
}

const NavigationLockContext = createContext<NavState & NavActions>({
  ...defaultState,
  unlockRecommendation: () => {},
  unlockComparison: () => {},
  unlockChatbot: () => {},
  lockChatbot: () => {},
  setRiskAssessmentCompleted: () => {},
  reset: () => {},
  setActiveBusiness: () => {},
})

export function NavigationLockProvider({ children }: { children: React.ReactNode }) {
  const user = useSelector(selectAuthUser)
  const userKey = user?.id ?? 'anon'

  const [businessId, setBusinessId] = useState<string | null>(() => {
    return sessionStore.getLastSelectedBusiness(user?.id ?? null)
  })
  const [state, setState] = useState<NavState>(defaultState)

  const storage = typeof window !== 'undefined' && userKey === 'anon' ? window.sessionStorage : window.localStorage
  const storageKey = `${STORAGE_KEY}:${userKey}:${businessId ?? '__none__'}`

  useEffect(() => {
    if (!businessId && user?.id) {
      const persisted = sessionStore.getLastSelectedBusiness(user.id)
      if (persisted) setBusinessId(persisted)
    }
  }, [user?.id, businessId])

  useEffect(() => {
    try {
      const raw = storage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<NavState>
        setState({
          recommendationUnlocked: Boolean(parsed.recommendationUnlocked),
          comparisonUnlocked: Boolean(parsed.comparisonUnlocked),
          chatbotUnlocked: Boolean(parsed.chatbotUnlocked),
          isRiskAssessmentCompleted: Boolean(parsed.isRiskAssessmentCompleted),
        })
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

  const setRiskAssessmentCompleted = useCallback((completed: boolean) => {
    setState((prev) => {
      if (!completed) {
        return defaultState
      }
      return {
        ...prev,
        isRiskAssessmentCompleted: true,
      }
    })
  }, [])

  const unlockRecommendation = useCallback(() => {
    setState((s) => ({ ...s, recommendationUnlocked: true, isRiskAssessmentCompleted: true }))
  }, [])

  const unlockComparison = useCallback(() => {
    setState((s) => ({ ...s, comparisonUnlocked: true, isRiskAssessmentCompleted: true }))
  }, [])

  const unlockChatbot = useCallback(() => {
    setState((s) => ({ ...s, chatbotUnlocked: true, isRiskAssessmentCompleted: true }))
  }, [])

  const lockChatbot = useCallback(() => {
    setState((s) => ({ ...s, chatbotUnlocked: false }))
  }, [])

  const reset = useCallback(() => setState(defaultState), [])

  const setActiveBusiness = useCallback((nextBusinessId: string | null | undefined) => {
    setBusinessId((prev) => (nextBusinessId === prev ? prev : (nextBusinessId ?? null)))
  }, [])

  return (
    <NavigationLockContext.Provider
      value={{
        ...state,
        unlockRecommendation,
        unlockComparison,
        unlockChatbot,
        lockChatbot,
        setRiskAssessmentCompleted,
        reset,
        setActiveBusiness,
      }}
    >
      {children}
    </NavigationLockContext.Provider>
  )
}

export function useNavigationLock() {
  return useContext(NavigationLockContext)
}

export default NavigationLockContext
