import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { selectAuthUser } from '../features/auth/authSlice'
import { loadComparisonState } from '../features/comparison/comparisonStorage'
import sessionStore from './sessionStore'

export type ProgressState = {
  recommendationViewed: boolean
  selectedPolicyCount: number
  comparisonCompleted: boolean
  selectedPolicyIds: string[]
  isRiskAssessmentCompleted: boolean
}

export type NavState = ProgressState & {
  recommendationUnlocked: boolean
  comparisonUnlocked: boolean
  chatbotUnlocked: boolean
  isHydrated: boolean
}

export type NavActions = {
  setRecommendationViewed: (viewed?: boolean) => void
  setSelectedPolicies: (policyIds: string[]) => void
  setComparisonCompleted: (completed?: boolean) => void
  unlockRecommendation: () => void
  unlockComparison: () => void
  unlockChatbot: () => void
  lockChatbot: () => void
  setRiskAssessmentCompleted: (completed: boolean) => void
  reset: () => void
  setActiveBusiness: (businessId: string | null | undefined) => void
}

const STORAGE_KEY = 'insuretech:progress:v2'

const defaultState: ProgressState = {
  recommendationViewed: false,
  selectedPolicyCount: 0,
  comparisonCompleted: false,
  selectedPolicyIds: [],
  isRiskAssessmentCompleted: false,
}

const defaultContextValue: NavState & NavActions = {
  ...defaultState,
  recommendationUnlocked: false,
  comparisonUnlocked: false,
  chatbotUnlocked: false,
  isHydrated: false,
  setRecommendationViewed: () => {},
  setSelectedPolicies: () => {},
  setComparisonCompleted: () => {},
  unlockRecommendation: () => {},
  unlockComparison: () => {},
  unlockChatbot: () => {},
  lockChatbot: () => {},
  setRiskAssessmentCompleted: () => {},
  reset: () => {},
  setActiveBusiness: () => {},
}

const NavigationLockContext = createContext<NavState & NavActions>(defaultContextValue)

export function NavigationLockProvider({ children }: { children: React.ReactNode }) {
  const user = useSelector(selectAuthUser)
  const userKey = user?.id ?? 'anon'

  const [businessId, setBusinessId] = useState<string | null>(() => {
    return sessionStore.getLastSelectedBusiness(user?.id ?? null)
  })
  const [state, setState] = useState<ProgressState>(defaultState)
  const [isHydrated, setIsHydrated] = useState(false)

  const storage = typeof window !== 'undefined' && userKey === 'anon' ? window.sessionStorage : window.localStorage
  const storageKey = `${STORAGE_KEY}:${userKey}:${businessId ?? '__none__'}`

  useEffect(() => {
    if (!businessId && user?.id) {
      const persisted = sessionStore.getLastSelectedBusiness(user.id)
      if (persisted) setBusinessId(persisted)
    }
  }, [user?.id, businessId])

  useEffect(() => {
    setIsHydrated(false)
    try {
      const persistedComparison = loadComparisonState(undefined, businessId ?? undefined)
      const comparisonCompletedFromStorage = Boolean(persistedComparison?.result)
      let selectedIdsFromStorage: string[] = []
      if (persistedComparison?.policyA && persistedComparison?.policyB) {
        selectedIdsFromStorage = [persistedComparison.policyA, persistedComparison.policyB]
      }

      const raw = storage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ProgressState>
        const selectedPolicyIds = Array.isArray(parsed.selectedPolicyIds) && parsed.selectedPolicyIds.length > 0
          ? parsed.selectedPolicyIds
          : selectedIdsFromStorage
        const selectedPolicyCount =
          typeof parsed.selectedPolicyCount === 'number'
            ? parsed.selectedPolicyCount
            : selectedPolicyIds.length
        const comparisonCompleted = Boolean(
          parsed.comparisonCompleted || comparisonCompletedFromStorage
        )
        const recommendationViewed = Boolean(
          parsed.recommendationViewed || comparisonCompleted || selectedPolicyCount >= 2
        )

        setState({
          recommendationViewed,
          selectedPolicyCount,
          comparisonCompleted,
          selectedPolicyIds,
          isRiskAssessmentCompleted: Boolean(parsed.isRiskAssessmentCompleted || recommendationViewed),
        })
        setIsHydrated(true)
        return
      }

      if (comparisonCompletedFromStorage) {
        setState({
          recommendationViewed: true,
          selectedPolicyCount: Math.max(selectedIdsFromStorage.length, 2),
          comparisonCompleted: true,
          selectedPolicyIds: selectedIdsFromStorage,
          isRiskAssessmentCompleted: true,
        })
        setIsHydrated(true)
        return
      }
    } catch {
      // ignore
    }
    setState(defaultState)
    setIsHydrated(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  useEffect(() => {
    if (!isHydrated) return
    try {
      storage.setItem(storageKey, JSON.stringify(state))
    } catch {
      // ignore
    }
  }, [state, storageKey, storage, isHydrated])

  const setRiskAssessmentCompleted = useCallback((completed: boolean) => {
    setState((prev) => {
      if (prev.isRiskAssessmentCompleted === completed) return prev
      if (!completed) {
        return defaultState
      }
      return {
        ...prev,
        isRiskAssessmentCompleted: true,
      }
    })
  }, [])

  const setRecommendationViewed = useCallback((viewed = true) => {
    setState((prev) => {
      if (prev.recommendationViewed === viewed) return prev
      return {
        ...prev,
        recommendationViewed: viewed,
        isRiskAssessmentCompleted: viewed ? true : prev.isRiskAssessmentCompleted,
      }
    })
  }, [])

  const setSelectedPolicies = useCallback((policyIds: string[]) => {
    setState((prev) => {
      if (
        prev.selectedPolicyIds.length === policyIds.length &&
        prev.selectedPolicyIds.every((id, idx) => id === policyIds[idx])
      ) {
        return prev
      }
      return {
        ...prev,
        selectedPolicyIds: policyIds,
        selectedPolicyCount: policyIds.length,
      }
    })
  }, [])

  const setComparisonCompleted = useCallback((completed = true) => {
    setState((prev) => {
      if (prev.comparisonCompleted === completed) return prev
      return {
        ...prev,
        comparisonCompleted: completed,
        recommendationViewed: completed ? true : prev.recommendationViewed,
        selectedPolicyCount: completed ? Math.max(prev.selectedPolicyCount, 2) : prev.selectedPolicyCount,
      }
    })
  }, [])

  const unlockRecommendation = useCallback(() => {
    setRecommendationViewed(true)
  }, [setRecommendationViewed])

  const unlockComparison = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedPolicyCount: Math.max(prev.selectedPolicyCount, 2),
    }))
  }, [])

  const unlockChatbot = useCallback(() => {
    setComparisonCompleted(true)
  }, [setComparisonCompleted])

  const lockChatbot = useCallback(() => {
    setState((prev) => ({
      ...prev,
      comparisonCompleted: false,
    }))
  }, [])

  const reset = useCallback(() => setState(defaultState), [])

  const setActiveBusiness = useCallback((nextBusinessId: string | null | undefined) => {
    setBusinessId((prev) => (nextBusinessId === prev ? prev : (nextBusinessId ?? null)))
  }, [])

  const recommendationUnlocked = isHydrated && Boolean(
    state.recommendationViewed || state.selectedPolicyCount >= 2 || state.comparisonCompleted
  )
  const comparisonUnlocked = isHydrated && Boolean(
    state.selectedPolicyCount >= 2 || state.comparisonCompleted
  )
  const chatbotUnlocked = isHydrated && Boolean(
    state.comparisonCompleted
  )

  return (
    <NavigationLockContext.Provider
      value={{
        ...state,
        recommendationUnlocked,
        comparisonUnlocked,
        chatbotUnlocked,
        isHydrated,
        setRecommendationViewed,
        setSelectedPolicies,
        setComparisonCompleted,
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
