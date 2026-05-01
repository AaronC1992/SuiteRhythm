// Client-side access token store.
// Tokens live ONLY in a module-scoped closure. We deliberately do NOT expose
// the token on `window` (XSS-readable) or persist new tokens in localStorage
// (also XSS-readable, plus survives logout). A one-time legacy migration reads
// the old localStorage key and immediately clears it.
const LEGACY_TOKEN_KEY = 'SuiteRhythm_token';

let clientAccessToken = null;
let legacyMigrated = false;

function migrateLegacyToken() {
  if (legacyMigrated) return null;
  legacyMigrated = true;
  if (typeof localStorage === 'undefined') return null;
  try {
    const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (legacyToken) {
      try { localStorage.removeItem(LEGACY_TOKEN_KEY); } catch (_) {}
      return legacyToken;
    }
  } catch (_) {}
  return null;
}

export function getClientAccessToken() {
  if (clientAccessToken) return clientAccessToken;
  const legacy = migrateLegacyToken();
  if (legacy) {
    clientAccessToken = legacy;
    return clientAccessToken;
  }
  return null;
}

export function setClientAccessToken(token) {
  clientAccessToken = token || null;
  // Defensive: clear any legacy persisted token on every set.
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch (_) {}
  // Defensive: scrub any old global if a previous build left one around.
  try {
    if (typeof window !== 'undefined' && 'SuiteRhythm_ACCESS_TOKEN' in window) {
      delete window.SuiteRhythm_ACCESS_TOKEN;
    }
  } catch (_) {}
}

