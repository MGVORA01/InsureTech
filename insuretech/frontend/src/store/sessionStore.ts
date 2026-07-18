export function getUserKey(userId?: string | null) {
  return userId ?? "anon";
}

function storageForUser() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function setLastSessionForBusiness(
  userId: string | null | undefined,
  businessId: string,
  sessionId: string,
) {
  try {
    const userKey = getUserKey(userId);
    const storage = storageForUser();
    if (!storage) return;
    const key = `insuretech:lastSession:${userKey}:${businessId}`;
    storage.setItem(key, sessionId);
  } catch {
    // ignore
  }
}

export function getLastSessionForBusiness(
  userId: string | null | undefined,
  businessId: string,
): string | null {
  try {
    const userKey = getUserKey(userId);
    const storage = storageForUser();
    if (!storage) return null;
    const key = `insuretech:lastSession:${userKey}:${businessId}`;
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function setLastSelectedBusiness(userId: string | null | undefined, businessId: string) {
  try {
    const userKey = getUserKey(userId);
    const storage = storageForUser();
    if (!storage) return;
    const key = `insuretech:lastBusiness:${userKey}`;
    storage.setItem(key, businessId);
  } catch {
    // ignore
  }
}

export function getLastSelectedBusiness(userId: string | null | undefined): string | null {
  try {
    const userKey = getUserKey(userId);
    const storage = storageForUser();
    if (!storage) return null;
    const key = `insuretech:lastBusiness:${userKey}`;
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export default {
  setLastSessionForBusiness,
  getLastSessionForBusiness,
  setLastSelectedBusiness,
  getLastSelectedBusiness,
};
