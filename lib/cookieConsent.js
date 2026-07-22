// Web-only cookie consent persistence (localStorage). Native has no concept
// of browser cookies, so callers should gate usage behind Platform.OS === 'web'.

const KEY = 'venn_cookie_consent';

export function getCookieConsent() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setCookieConsent(value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // ignore (e.g. storage disabled/full)
  }
}

export function resetCookieConsent() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
