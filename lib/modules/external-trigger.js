/**
 * External integrations bridge.
 *
 * Single, documented surface for external controllers (Stream Deck,
 * OBS browser source, custom webhooks, bookmarklets, Twitch chat, etc.)
 * to drive SuiteRhythm without touching its internals.
 *
 * Three equivalent command channels, all dispatched through the same
 * handler so authorization and rate-limiting live in one place:
 *
 *   1. Direct JS:       window.SuiteRhythm.trigger('thunder')
 *   2. window events:   window.dispatchEvent(new CustomEvent('suiterhythm:command',
 *                         { detail: { type: 'trigger', query: 'thunder' } }))
 *   3. postMessage:     window.postMessage({ suiterhythm: 'trigger', query: 'thunder' }, '*')
 *                       (useful for OBS browser-source bridges embedding
 *                       SuiteRhythm in an <iframe>)
 *
 * Plus an anonymous Twitch IRC client that forwards !bang-commands
 * from chat to the same handler — zero OAuth, read-only.
 *
 * Design notes:
 * - No globals other than `window.SuiteRhythm` (documented, intentional).
 * - Per-command rate limit (default 500ms) so a stuck chat flood can't
 *   DoS the audio graph.
 * - Origin allowlist for postMessage (empty = reject all cross-origin).
 */

import { normalizeAudioUrl } from './audio-url.js';

const DEFAULT_RATE_LIMIT_MS = 500;

/**
 * @typedef {Object} CommandContext
 * @property {'api'|'event'|'postMessage'|'twitch'} source
 * @property {string} [user]
 * @property {string} [origin]
 */

export class ExternalBridge {
    /**
     * @param {object} engine   SuiteRhythm instance
     * @param {object} [opts]
     * @param {number} [opts.rateLimitMs]
     * @param {string[]} [opts.allowedOrigins]   Origins allowed via postMessage. '*' for any (discouraged).
     */
    constructor(engine, opts = {}) {
        this.engine = engine;
        this.rateLimitMs = opts.rateLimitMs ?? DEFAULT_RATE_LIMIT_MS;
        this.allowedOrigins = new Set(opts.allowedOrigins || []);
        this._lastFire = new Map(); // command -> ts
        this._twitch = null;
        this._installed = false;
    }

    install() {
        if (this._installed || typeof window === 'undefined') return;
        this._installed = true;

        // 1. Direct JS surface.
        const api = {
            trigger: (query, options) => this.handle({ type: 'trigger', query, options }, { source: 'api' }),
            stopAll: () => this.handle({ type: 'stopAll' }, { source: 'api' }),
            scene:   (name) => this.handle({ type: 'scene', name }, { source: 'api' }),
            status:  () => this._status(),
            twitch:  {
                connect:    (channel) => this.connectTwitch(channel),
                disconnect: () => this.disconnectTwitch(),
            },
        };
        // Attach to window without stomping any pre-existing field.
        window.SuiteRhythm = Object.assign(window.SuiteRhythm || {}, api);

        // 2. CustomEvent channel.
        this._eventListener = (e) => {
            const cmd = e?.detail;
            if (cmd && typeof cmd === 'object') this.handle(cmd, { source: 'event' });
        };
        window.addEventListener('suiterhythm:command', this._eventListener);

        // 3. postMessage channel.
        this._pmListener = (e) => {
            const data = e?.data;
            if (!data || typeof data !== 'object' || !data.suiterhythm) return;
            if (!this._originAllowed(e.origin)) return;
            const cmd = { type: data.suiterhythm, ...data };
            delete cmd.suiterhythm;
            this.handle(cmd, { source: 'postMessage', origin: e.origin });
        };
        window.addEventListener('message', this._pmListener);
    }

    uninstall() {
        if (!this._installed || typeof window === 'undefined') return;
        this._installed = false;
        try { window.removeEventListener('suiterhythm:command', this._eventListener); } catch (_) {}
        try { window.removeEventListener('message', this._pmListener); } catch (_) {}
        this.disconnectTwitch();
    }

    _originAllowed(origin) {
        if (this.allowedOrigins.has('*')) return true;
        if (!origin) return true; // same-window (postMessage with no origin)
        const selfOrigin = (typeof window !== 'undefined' && window.location?.origin)
            || (typeof location !== 'undefined' ? location.origin : '');
        if (selfOrigin && origin === selfOrigin) return true;
        return this.allowedOrigins.has(origin);
    }

    _status() {
        const e = this.engine || {};
        return {
            mode: e.currentMode ?? null,
            mood: e.currentMood?.primary ?? null,
            listening: !!e.isListening,
            music: e.currentMusic?.name ?? null,
            activeSounds: e.activeSounds ? e.activeSounds.size : 0,
            twitch: this._twitch ? { connected: this._twitch.isConnected(), channel: this._twitch.channel } : null,
        };
    }

    /**
     * Rate-limited dispatcher. Unknown commands are silently ignored so a
     * future command type doesn't crash older clients.
     */
    async handle(cmd, ctx = { source: 'api' }) {
        if (!cmd || typeof cmd.type !== 'string') return { ok: false, error: 'invalid command' };
        const now = Date.now();
        const key = `${cmd.type}:${cmd.query || cmd.name || ''}`;
        const last = this._lastFire.get(key) || 0;
        if (now - last < this.rateLimitMs) return { ok: false, error: 'rate-limited' };
        this._lastFire.set(key, now);

        try {
            switch (cmd.type) {
                case 'trigger':   return await this._cmdTrigger(cmd, ctx);
                case 'stopAll':   return this._cmdStopAll();
                case 'scene':     return this._cmdScene(cmd);
                default:          return { ok: false, error: 'unknown command' };
            }
        } catch (err) {
            return { ok: false, error: err?.message || String(err) };
        }
    }

    async _cmdTrigger({ query, options }, ctx) {
        if (!query || typeof query !== 'string') return { ok: false, error: 'missing query' };
        const engine = this.engine;
        if (!engine || typeof engine.searchAudio !== 'function') return { ok: false, error: 'engine unavailable' };

        // First try exact id/name match against the catalog so Stream Deck
        // buttons can target a specific file. Fall back to fuzzy search.
        let url = null;
        let name = query;
        const catalog = Array.isArray(engine.soundCatalog) ? engine.soundCatalog : [];
        const lower = query.trim().toLowerCase();
        const exact = catalog.find(s => (s.id && s.id.toLowerCase() === lower) || (s.name && s.name.toLowerCase() === lower));
        if (exact) {
            url = typeof engine.buildSrcCandidates === 'function' ? null : exact.src;
            // Let playAudio resolve the real URL through its normal path.
            url = exact.src ? normalizeAudioUrl(exact.src) : null;
            name = exact.name || exact.id;
        }
        if (!url) {
            url = await engine.searchAudio(query, options?.type || 'sfx');
        }
        if (!url) return { ok: false, error: 'not found' };

        const playOpts = {
            type: options?.type || 'sfx',
            name,
            volume: typeof options?.volume === 'number' ? options.volume : (typeof engine.calculateVolume === 'function' ? engine.calculateVolume(0.7) : 0.7),
            loop: !!options?.loop,
        };
        const result = await engine.playAudio(url, playOpts);
        // Thread the played soundId back so external callers can target
        // this specific instance later (e.g. to stop just this sound).
        const soundId = result?.soundId ?? result?.id ?? null;
        return { ok: true, source: ctx.source, name, soundId, url };
    }

    _cmdStopAll() {
        if (typeof this.engine?.stopAllAudio === 'function') {
            this.engine.stopAllAudio();
            return { ok: true };
        }
        return { ok: false, error: 'engine unavailable' };
    }

    _cmdScene({ name }) {
        if (!name) return { ok: false, error: 'missing name' };
        const presets = this.engine?.scenePresets || [];
        const preset = presets.find(p => p.name?.toLowerCase() === String(name).toLowerCase());
        if (!preset) return { ok: false, error: 'preset not found' };
        if (typeof this.engine.applyScenePreset === 'function') {
            this.engine.applyScenePreset(preset);
            return { ok: true };
        }
        return { ok: false, error: 'engine unavailable' };
    }

    // ---------- Twitch chat bridge (anonymous, read-only) ----------

    connectTwitch(channel) {
        if (!channel || typeof channel !== 'string') return { ok: false, error: 'missing channel' };
        this.disconnectTwitch();
        try {
            this._twitch = new TwitchChat(channel.toLowerCase().replace(/^#/, ''), (msg) => this._onTwitchMessage(msg));
            this._twitch.connect();
            return { ok: true };
        } catch (err) {
            this._twitch = null;
            return { ok: false, error: err?.message || String(err) };
        }
    }

    disconnectTwitch() {
        try { this._twitch?.disconnect?.(); } catch (_) {}
        this._twitch = null;
    }

    _onTwitchMessage({ user, text }) {
        // Only act on !bang commands so regular chat doesn't spam sounds.
        //   !sfx <query>    → trigger sfx
        //   !stop           → stopAll
        //   !scene <name>   → scene preset
        const m = /^!(\w+)\s*(.*)$/.exec(text);
        if (!m) return;
        const [, verb, rest] = m;
        const arg = rest.trim();
        const ctx = { source: 'twitch', user };
        if (verb === 'sfx' && arg) this.handle({ type: 'trigger', query: arg }, ctx);
        else if (verb === 'stop') this.handle({ type: 'stopAll' }, ctx);
        else if (verb === 'scene' && arg) this.handle({ type: 'scene', name: arg }, ctx);
    }
}

/**
 * Minimal anonymous Twitch IRC-over-WebSocket client.
 * Uses a `justinfan<rand>` nickname so no OAuth is needed — we can only
 * read, never write. That's exactly what we want for sound triggers.
 */
class TwitchChat {
    constructor(channel, onMessage) {
        this.channel = channel;
        this.onMessage = onMessage;
        this.ws = null;
        this._reconnectTimer = null;
        this._backoffMs = 1000;
    }

    isConnected() { return !!this.ws && this.ws.readyState === 1; }

    connect() {
        const nick = 'justinfan' + Math.floor(Math.random() * 80000 + 1000);
        this.ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
        this.ws.onopen = () => {
            this._backoffMs = 1000;
            this.ws.send('CAP REQ :twitch.tv/tags\r\n');
            this.ws.send(`NICK ${nick}\r\n`);
            this.ws.send(`JOIN #${this.channel}\r\n`);
        };
        this.ws.onmessage = (e) => {
            const raw = String(e.data || '');
            // Keep the connection alive.
            if (raw.startsWith('PING')) { try { this.ws.send('PONG :tmi.twitch.tv\r\n'); } catch (_) {} return; }
            // Parse each IRC line. We only care about PRIVMSG.
            for (const line of raw.split(/\r?\n/)) {
                if (!line) continue;
                const priv = /PRIVMSG\s+#\S+\s+:(.*)$/.exec(line);
                if (!priv) continue;
                const userMatch = /:([^!]+)!/.exec(line);
                this.onMessage?.({ user: userMatch?.[1] || 'unknown', text: priv[1] });
            }
        };
        this.ws.onclose = () => this._scheduleReconnect();
        this.ws.onerror = () => { try { this.ws.close(); } catch (_) {} };
    }

    disconnect() {
        if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
        try { this.ws?.close?.(); } catch (_) {}
        this.ws = null;
    }

    _scheduleReconnect() {
        if (this._reconnectTimer) return;
        const delay = Math.min(30000, this._backoffMs);
        this._backoffMs = Math.min(30000, this._backoffMs * 2);
        this._reconnectTimer = setTimeout(() => {
            this._reconnectTimer = null;
            if (this.channel) { try { this.connect(); } catch (_) {} }
        }, delay);
    }
}
