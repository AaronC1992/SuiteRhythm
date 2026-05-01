import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  let store;

  beforeEach(async () => {
    vi.resetModules();
    // Import fresh so the module-scoped token state is reset between tests.
    store = await import('../lib/client-token-store.js');
  });

  afterEach(() => {
    store?.setClientAccessToken(null);
    delete globalThis.window;
    delete globalThis.localStorage;
  });

  it('keeps new access tokens in a module closure (not on window or localStorage)', () => {
    const storage = installBrowserGlobals();

    store.setClientAccessToken('token-123');

    expect(store.getClientAccessToken()).toBe('token-123');
    // Token must NOT be exposed on the global window object (XSS hardening).
    expect(globalThis.window.SuiteRhythm_ACCESS_TOKEN).toBeUndefined();
    expect(storage.has('SuiteRhythm_token')).toBe(false);
  });

  it('migrates and removes a legacy localStorage token without exposing it on window', () => {
    const storage = installBrowserGlobals('legacy-token');

    expect(store.getClientAccessToken()).toBe('legacy-token');
    expect(globalThis.window.SuiteRhythm_ACCESS_TOKEN).toBeUndefined();
    expect(storage.has('SuiteRhythm_token')).toBe(false);
  });

  it('scrubs a stale window.SuiteRhythm_ACCESS_TOKEN on set', () => {
    installBrowserGlobals();
    globalThis.window.SuiteRhythm_ACCESS_TOKEN = 'leaked';

    store.setClientAccessToken('fresh');

    expect('SuiteRhythm_ACCESS_TOKEN' in globalThis.window).toBe(false);
    expect(store.getClientAccessToken()).toBe('fresh');
  });
});

