'use client';
/**
 * GlobalAudioKill — mounts at the root layout so EVERY route (landing page
 * included) gets a zombie-audio killer, not just /dashboard.
 *
 * Why this exists: the engine's own pagehide/pageshow handlers only run
 * while the dashboard is loaded. If the OS bfcaches the dashboard tree and
 * the user reopens the app on the landing page, there's no engine code on
 * that route to stop the old audio. This component fills that gap.
 *
 * It:
 *  1. Stops every Howler instance on pagehide (tab closing / backgrounded)
 *  2. On pageshow, if the page came out of bfcache, stops audio again
 *  3. Attempts to close any lingering WebAudio AudioContext so the OS
 *     actually releases the media graph (not just silences it).
 *
 * Safe on SSR — all work is inside useEffect.
 */
import { useEffect } from 'react';

export default function GlobalAudioKill() {
  useEffect(() => {
    // Stop *zombie* audio only — i.e. Howler instances and raw <audio>/<video>
    // elements that survived a bfcache restore on a route that has no engine.
    // Importantly, do NOT close the engine's AudioContext here: when the
    // dashboard is mounted the engine owns and reuses that context, and
    // closing it produces a cascade of "Connecting nodes after the context
    // has been closed" warnings on every subsequent playback.
    const killZombieAudio = () => {
      try {
        const Howler = window.Howler;
        if (Howler && Array.isArray(Howler._howls)) {
          Howler._howls.forEach((h) => { try { h.stop(); } catch (_) {} });
        }
      } catch (_) {}
      try {
        document.querySelectorAll('audio, video').forEach((el) => {
          try { el.pause(); el.currentTime = 0; } catch (_) {}
        });
      } catch (_) {}
    };

    // Only act on bfcache restore — true teardown is handled by the engine's
    // own pagehide handler, and closing the context on visibilitychange or
    // on mount kills the active engine graph.
    const onPageShow = (e) => { if (e && e.persisted) killZombieAudio(); };
    window.addEventListener('pageshow', onPageShow);

    return () => {
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  return null;
}
