<div align="center">

# SuiteRhythm

### Intelligent Audio Companion for Tabletop RPGs

AI-powered ambient sound designer that listens to your game in real time and automatically plays contextually-appropriate music and sound effects.

<br>

[![Play Now](https://img.shields.io/badge/Play%20Now-SuiteRhythm-8a2be2?style=for-the-badge&logoColor=white)](https://suiterhythm.vercel.app)

<br>

</div>

---

## The Problem

Tabletop RPG game masters spend hours curating playlists and manually triggering sound effects mid-session. It breaks immersion, splits focus, and most groups just skip audio entirely.

## The Solution

SuiteRhythm listens to what's happening at the table and **automatically** plays the right sounds at the right time — no manual input needed.

- A player says *"I kick down the tavern door"* — tavern ambiance fades in
- The DM describes a thunderstorm — rain and thunder start rolling
- Combat breaks out — the music shifts to battle drums

The GM stays in the story. The players stay immersed. The audio just works.

## How It Works

SuiteRhythm uses **speech recognition** to capture live conversation, sends it through an **AI analysis layer** (GPT-4.1), and maps the output to a curated library of **700+ sound effects, ambience beds, and music tracks** — all in real time.

```
Voice Input → Speech Recognition → AI Context Analysis → Sound Matching → Playback
```

### Key Capabilities

| Feature | Description |
|---|---|
| **Auto-Detect Mode** | Listens to live speech and triggers sounds automatically via AI |
| **Story Mode** | Pre-written narrative scenes with timed audio cues |
| **Sound Library** | 700+ categorized sounds — ambient, combat, weather, creatures, music |
| **Session Recording** | Browser mixed-session export for review, editing, and show notes |
| **Control Board** | Manual triggers for GMs who want direct control alongside auto-detect |
| **Smart Layering** | Multiple sounds play simultaneously with intelligent volume balancing |
| **Instant Response** | Sub-second latency from spoken word to audio playback |

## Market Opportunity

The tabletop RPG market has grown into a **$2B+ industry** (2025), fueled by actual-play content (Critical Role, Dimension 20) and the mainstreaming of D&D. Supporting tools — VTTs, digital maps, audio — are a fast-growing adjacent segment.

**No product on the market offers real-time, voice-reactive audio.**

Current alternatives require manual playlist management (Syrinscape, Tabletop Audio) or pre-configured triggers. SuiteRhythm is the first to close the loop between spoken narrative and dynamic audio — zero-touch.

### Target Users

- **Game Masters** running in-person or online TTRPG sessions
- **Actual-play streamers & podcasters** looking for production-quality audio
- **Game cafes & event organizers** hosting RPG nights
- **LARP & immersive experience designers**

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, React 19 |
| **Audio Engine** | Howler.js — custom engine with layering, fading, preloading |
| **AI Analysis** | OpenAI GPT-4.1 (server-side) |
| **Speech Recognition** | Web Speech API (native browser) |
| **Database** | Supabase (PostgreSQL) |
| **Media Storage** | Cloudflare R2 (700+ audio files via CDN proxy) |
| **Hosting** | Vercel (serverless, edge-optimized) |

## Beta Login

SuiteRhythm currently uses one temporary shared free tester login while the app is in private testing:

- Username: `tester`
- Password: `password`

Required deployment variables for login:

- `API_AUTH_SECRET`
- `BETA_TESTER_ENABLED=true`
- `BETA_TESTER_USERNAME=tester`
- `BETA_TESTER_PASSWORD=password`
- `BETA_AUTH_SECRET` if you want tester sessions signed with a separate secret from `API_AUTH_SECRET`

The app routes `/dashboard` and `/obs` require that signed tester session. The backend API token endpoint also requires the same session before it issues short-lived API tokens. To revoke free tester access, set `BETA_TESTER_ENABLED=false`, change `BETA_TESTER_PASSWORD`, or rotate `BETA_AUTH_SECRET`/`API_AUTH_SECRET`; existing tester cookies will stop validating.

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   Browser Client                  │
│                                                    │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  Speech   │→│    AI     │→│  Sound Engine   │  │
│  │  Input    │  │ Director  │  │  (Howler.js)   │  │
│  └──────────┘  └──────────┘  └────────────────┘  │
│                      ↕                             │
└──────────────────────┼─────────────────────────────┘
                       │ API
          ┌────────────┼────────────┐
          │            │            │
    ┌─────▼─────┐ ┌───▼────┐ ┌───▼────┐
    │  OpenAI   │ │Supabase│ │  R2    │
    │  GPT-4.1  │ │  (DB)  │ │ (CDN)  │
    └───────────┘ └────────┘ └────────┘
```

## Traction & Status

- **Fully functional product** — live and playable today
- **700+ curated sound assets** hosted on CDN
- **AI pipeline operational** — real-time analysis with sub-second response
- **Zero-config user experience** — open the app and press play

## Business Model (Planned)

| Tier | Price | Features |
|---|---|---|
| **Beta** | $0 | Core auto-detect, full current library, scene presets |
| **Pro** | $15/mo planned | Story mode, custom sounds, priority AI, OBS overlay |
| **Table License** | Contact | Multi-device sync, shared sessions, commercial use |

## Roadmap

- **Multi-device sync** — shared audio across a full table of players
- **Custom sound uploads** — bring your own audio library
- **VTT integrations** — Foundry VTT, Roll20, Owlbear Rodeo
- **Mobile companion app** — control board from your phone
- **Community marketplace** — user-created sound packs and story scenes

## External Controllers (`window.SuiteRhythm`)

SuiteRhythm exposes a small, stable command surface for external controllers — Stream Deck plugins, OBS browser sources, bookmarklets, webhooks, and anonymous Twitch chat. Every channel funnels into the same rate-limited handler, so your integration never depends on engine internals.

### Command channels

```js
// 1. Direct JS (same-page integrations / devtools)
await window.SuiteRhythm.trigger('thunder');                 // by name or id
await window.SuiteRhythm.trigger('rolling thunder', { volume: 0.8 });
await window.SuiteRhythm.stopAll();
await window.SuiteRhythm.scene('Combat');
window.SuiteRhythm.status();                                 // { mode, mood, listening, music, activeSounds, twitch }

// 2. CustomEvent (for modules that load before window.SuiteRhythm is attached)
window.dispatchEvent(new CustomEvent('suiterhythm:command', {
    detail: { type: 'trigger', query: 'thunder' }
}));

// 3. postMessage (OBS browser sources / iframes — origin-gated)
window.postMessage({ suiterhythm: 'trigger', query: 'thunder' }, '*');
```

All `trigger` calls resolve to `{ ok, name, soundId, url, source }` so you can later stop a specific instance with the engine API.

### Twitch chat bridge (no OAuth)

```js
window.SuiteRhythm.twitch.connect('aaronc1992');
// Viewers can now type in chat:
//   !sfx thunder       → plays a thunder SFX
//   !stop              → stops all audio
//   !scene Combat      → applies the Combat scene preset
window.SuiteRhythm.twitch.disconnect();
```

SuiteRhythm joins as an anonymous `justinfan*` user over Twitch's WebSocket IRC gateway — **read-only, no tokens, no chat writes**. Unknown bang-commands are ignored. Commands are rate-limited (500ms per `type:query` pair by default) so a chat flood can't thrash the audio graph.

### Rate limiting & origin allowlist

- Default rate limit: 500ms per command key.
- `postMessage` commands from cross-origin pages are rejected unless the origin is in `allowedOrigins` (set when constructing the bridge). Same-origin messages always pass.
- Unknown command types return `{ ok: false, error: 'unknown command' }` rather than throwing, so older clients don't crash when a newer bridge adds commands.

## Get in Touch

Interested in SuiteRhythm? Reach out:

- **Live Demo:** [suiterhythm.vercel.app](https://suiterhythm.vercel.app)
- **GitHub:** [AaronC1992/SuiteRhythm](https://github.com/AaronC1992/SuiteRhythm)

---

<div align="center">

Built by **Aaron C.** — solo developer, game master, and audio nerd.

</div>
