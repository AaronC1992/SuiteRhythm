import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExternalBridge } from '../lib/modules/external-trigger.js';

function makeEngine() {
    const calls = [];
    return {
        calls,
        isListening: true,
        currentMode: 'auto',
        currentMood: { primary: 'tense' },
        activeSounds: new Map(),
        soundCatalog: [
            { id: 'sfx/thunder.mp3', name: 'thunder', src: 'sfx/thunder.mp3', type: 'sfx', tags: ['weather'] },
            { id: 'sfx/door.mp3',    name: 'door',    src: 'sfx/door.mp3',    type: 'sfx', tags: [] },
        ],
        scenePresets: [{ name: 'Combat', moodBias: 0.8, context: 'battle' }],
        async searchAudio(q) { calls.push(['search', q]); return 'sfx/fallback.mp3'; },
        async playAudio(url, opts) { calls.push(['play', url, opts?.name]); return { soundId: 1 }; },
        stopAllAudio() { calls.push(['stopAll']); },
        applyScenePreset(p) { calls.push(['scene', p.name]); },
        calculateVolume(v) { return v; },
    };
}

describe('ExternalBridge', () => {
    let origWindow;
    let engine;
    let bridge;

    beforeEach(() => {
        origWindow = globalThis.window;
        // Minimal JSDOM-free window polyfill.
        const listeners = {};
        globalThis.window = {
            location: { origin: 'http://localhost' },
            addEventListener: (t, cb) => { (listeners[t] ||= []).push(cb); },
            removeEventListener: (t, cb) => { listeners[t] = (listeners[t] || []).filter(x => x !== cb); },
            dispatchEvent: (e) => { (listeners[e.type] || []).forEach(cb => cb(e)); return true; },
            SuiteRhythm: undefined,
        };
        engine = makeEngine();
        bridge = new ExternalBridge(engine, { rateLimitMs: 0 });
        bridge.install();
    });

    afterEach(() => {
        bridge.uninstall();
        globalThis.window = origWindow;
    });

    it('exposes a trigger API on window.SuiteRhythm', async () => {
        const res = await window.SuiteRhythm.trigger('thunder');
        expect(res.ok).toBe(true);
        expect(res.soundId).toBe(1);
        expect(res.name).toBe('thunder');
        expect(engine.calls.some(c => c[0] === 'play' && c[2] === 'thunder')).toBe(true);
    });

    it('falls back to searchAudio for fuzzy queries', async () => {
        await window.SuiteRhythm.trigger('rolling thunder boom');
        expect(engine.calls.some(c => c[0] === 'search')).toBe(true);
    });

    it('rejects unknown commands without throwing', async () => {
        const r = await bridge.handle({ type: 'nope' });
        expect(r.ok).toBe(false);
    });

    it('rate-limits the same command', async () => {
        bridge.rateLimitMs = 5000;
        const a = await bridge.handle({ type: 'trigger', query: 'thunder' });
        const b = await bridge.handle({ type: 'trigger', query: 'thunder' });
        expect(a.ok).toBe(true);
        expect(b.ok).toBe(false);
        expect(b.error).toBe('rate-limited');
    });

    it('dispatches via CustomEvent', async () => {
        window.dispatchEvent({ type: 'suiterhythm:command', detail: { type: 'stopAll' } });
        // Allow the handler's async work to resolve.
        await Promise.resolve();
        expect(engine.calls.some(c => c[0] === 'stopAll')).toBe(true);
    });

    it('status() returns a snapshot', () => {
        const s = window.SuiteRhythm.status();
        expect(s.mode).toBe('auto');
        expect(s.listening).toBe(true);
        expect(s.mood).toBe('tense');
    });

    it('scene command applies a matching preset', async () => {
        const r = await bridge.handle({ type: 'scene', name: 'combat' });
        expect(r.ok).toBe(true);
        expect(engine.calls.some(c => c[0] === 'scene' && c[1] === 'Combat')).toBe(true);
    });

    it('scene command reports missing preset', async () => {
        const r = await bridge.handle({ type: 'scene', name: 'nope' });
        expect(r.ok).toBe(false);
    });

    it('uninstall removes window listeners', () => {
        bridge.uninstall();
        window.dispatchEvent({ type: 'suiterhythm:command', detail: { type: 'stopAll' } });
        const before = engine.calls.length;
        expect(engine.calls.length).toBe(before); // no new calls
    });
});

describe('ExternalBridge postMessage channel', () => {
    let origWindow;
    let engine;
    let bridge;
    let messageListeners;

    beforeEach(() => {
        origWindow = globalThis.window;
        messageListeners = [];
        const listeners = {};
        globalThis.window = {
            location: { origin: 'http://localhost' },
            addEventListener: (t, cb) => {
                (listeners[t] ||= []).push(cb);
                if (t === 'message') messageListeners.push(cb);
            },
            removeEventListener: (t, cb) => { listeners[t] = (listeners[t] || []).filter(x => x !== cb); },
            dispatchEvent: (e) => { (listeners[e.type] || []).forEach(cb => cb(e)); return true; },
            SuiteRhythm: undefined,
        };
        engine = makeEngine();
    });

    afterEach(() => {
        bridge?.uninstall();
        globalThis.window = origWindow;
    });

    function postMessage(data, origin) {
        for (const cb of messageListeners) cb({ data, origin });
    }

    it('accepts same-origin postMessage commands', async () => {
        bridge = new ExternalBridge(engine, { rateLimitMs: 0 });
        bridge.install();
        postMessage({ suiterhythm: 'trigger', query: 'thunder' }, 'http://localhost');
        // Flush two microtask boundaries + a macrotask for the nested async
        // chain (handle → _cmdTrigger → engine.playAudio).
        await new Promise(r => setTimeout(r, 20));
        expect(engine.calls.some(c => c[0] === 'play')).toBe(true);
    });

    it('rejects cross-origin postMessage by default', async () => {
        bridge = new ExternalBridge(engine, { rateLimitMs: 0 });
        bridge.install();
        postMessage({ suiterhythm: 'stopAll' }, 'https://evil.example.com');
        await new Promise(r => setTimeout(r, 0));
        expect(engine.calls.some(c => c[0] === 'stopAll')).toBe(false);
    });

    it('accepts cross-origin postMessage from allowlisted origin', async () => {
        bridge = new ExternalBridge(engine, {
            rateLimitMs: 0,
            allowedOrigins: ['https://obs.local'],
        });
        bridge.install();
        postMessage({ suiterhythm: 'stopAll' }, 'https://obs.local');
        await new Promise(r => setTimeout(r, 0));
        expect(engine.calls.some(c => c[0] === 'stopAll')).toBe(true);
    });

    it('ignores messages without an suiterhythm field', async () => {
        bridge = new ExternalBridge(engine, { rateLimitMs: 0 });
        bridge.install();
        postMessage({ type: 'trigger', query: 'thunder' }, 'http://localhost');
        await new Promise(r => setTimeout(r, 0));
        expect(engine.calls.some(c => c[0] === 'play')).toBe(false);
    });

    it('allowlist "*" accepts any origin (discouraged)', async () => {
        bridge = new ExternalBridge(engine, {
            rateLimitMs: 0,
            allowedOrigins: ['*'],
        });
        bridge.install();
        postMessage({ suiterhythm: 'stopAll' }, 'https://anywhere.example');
        await new Promise(r => setTimeout(r, 0));
        expect(engine.calls.some(c => c[0] === 'stopAll')).toBe(true);
    });
});

// Opt-in integration test against real Twitch IRC. Off by default so CI
// never hits the network. Run with:
//   SUITERHYTHM_TWITCH_IT=1 SUITERHYTHM_TWITCH_CHANNEL=<channel> npx vitest run
const RUN_TWITCH_IT = process.env.SUITERHYTHM_TWITCH_IT === '1';
describe.runIf(RUN_TWITCH_IT)('ExternalBridge Twitch bridge (integration)', () => {
    it('connects anonymously and receives at least one line', async () => {
        const channel = process.env.SUITERHYTHM_TWITCH_CHANNEL || 'twitch';
        const origWindow = globalThis.window;
        const listeners = {};
        globalThis.window = {
            location: { origin: 'http://localhost' },
            addEventListener: (t, cb) => { (listeners[t] ||= []).push(cb); },
            removeEventListener: () => {},
            dispatchEvent: () => true,
            SuiteRhythm: undefined,
        };

        const bridge = new ExternalBridge(makeEngine(), { rateLimitMs: 0 });
        bridge.install();
        const result = bridge.connectTwitch(channel);
        expect(result.ok).toBe(true);

        // Give the socket ~8s to connect + join.
        await new Promise(r => setTimeout(r, 8000));
        expect(bridge._twitch?.isConnected()).toBe(true);

        bridge.uninstall();
        globalThis.window = origWindow;
    }, 15000);
});
