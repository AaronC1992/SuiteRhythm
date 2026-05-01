import { afterEach, describe, expect, it } from 'vitest';
import { getClientAccessToken, setClientAccessToken } from '../lib/client-token-store.js';

function installBrowserGlobals(initialToken = null) {
  const storage = new Map(initialToken ? [['SuiteRhythm_token', initialToken]] : []);
  globalThis.window = {};
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  };
  return storage;
}

describe('client token store', () => {
  afterEach(() => {
    setClientAccessToken(null);
    delete globalThis.window;
    delete globalThis.localStorage;
  });

  it('keeps new access tokens out of localStorage', () => {
    const storage = installBrowserGlobals();

    setClientAccessToken('token-123');

    expect(getClientAccessToken()).toBe('token-123');
    expect(globalThis.window.SuiteRhythm_ACCESS_TOKEN).toBe('token-123');
    expect(storage.has('SuiteRhythm_token')).toBe(false);
  });

  it('migrates and removes a legacy localStorage token', () => {
    const storage = installBrowserGlobals('legacy-token');

    expect(getClientAccessToken()).toBe('legacy-token');
    expect(globalThis.window.SuiteRhythm_ACCESS_TOKEN).toBe('legacy-token');
    expect(storage.has('SuiteRhythm_token')).toBe(false);
  });
});
