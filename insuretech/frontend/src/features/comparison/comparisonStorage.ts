import type { CompareResponse } from "./comparison.types";

export interface PersistedComparisonState {
  policyA: string;
  policyB: string;
  result: CompareResponse | null;
  updatedAt: string;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function buildStorageKey(sessionId?: string, businessProfileId?: string) {
  const parts = ["insuretech:comparison"];
  if (sessionId) parts.push(sessionId);
  if (businessProfileId) parts.push(businessProfileId);
  return parts.join(":");
}

export function saveComparisonState(
  sessionId: string | undefined,
  businessProfileId: string | undefined,
  state: PersistedComparisonState,
) {
  const storage = getStorage();
  if (!storage) return;

  const key = buildStorageKey(sessionId, businessProfileId);
  storage.setItem(key, JSON.stringify(state));
}

export function loadComparisonState(
  sessionId: string | undefined,
  businessProfileId: string | undefined,
): PersistedComparisonState | null {
  const storage = getStorage();
  if (!storage) return null;

  const key = buildStorageKey(sessionId, businessProfileId);
  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PersistedComparisonState;
  } catch {
    return null;
  }
}
