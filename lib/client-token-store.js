const LEGACY_TOKEN_KEY = 'SuiteRhythm_token';

let clientAccessToken = null;

export function getClientAccessToken() {
  if (typeof window !== 'undefined' && window.SuiteRhythm_ACCESS_TOKEN) {
    return window.SuiteRhythm_ACCESS_TOKEN;
  }
  if (clientAccessToken) return clientAccessToken;

  try {
    const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (legacyToken) {
      setClientAccessToken(legacyToken);
      return legacyToken;
    }
  } catch (_) {}

  return null;
}

export function setClientAccessToken(token) {
  clientAccessToken = token || null;

  try {
    if (typeof window !== 'undefined') {
      if (clientAccessToken) window.SuiteRhythm_ACCESS_TOKEN = clientAccessToken;
      else delete window.SuiteRhythm_ACCESS_TOKEN;
    }
  } catch (_) {}

  try { localStorage.removeItem(LEGACY_TOKEN_KEY); } catch (_) {}
}
