'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getCueTime } from './CueTimeline';
import { normalizeAudioUrl } from '../../lib/modules/audio-url.js';

export default function PreviewMixer({ mediaRef, cues, onPreviewCue }) {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [status, setStatus] = useState('Preview Mix ready.');
  const firedRef = useRef(new Set());
  const lastFireRef = useRef(new Map());
  const activeAudioRef = useRef([]);
  const sortedCues = useMemo(() => [...cues].sort((a, b) => getCueTime(a) - getCueTime(b)), [cues]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return undefined;

    const handleTimeUpdate = () => {
      if (!isPreviewing) return;
      const currentTime = media.currentTime;
      sortedCues.forEach((cue) => {
        const cueTime = getCueTime(cue);
        if (firedRef.current.has(cue.id) || cueTime > currentTime + 0.08) return;
        firedRef.current.add(cue.id);
        const lastFire = lastFireRef.current.get(cue.soundId || cue.cueType) || 0;
        if (performance.now() - lastFire < 250) return;
        lastFireRef.current.set(cue.soundId || cue.cueType, performance.now());
        playCue(cue, activeAudioRef.current);
      });
    };
    const handleEnded = () => {
      setIsPreviewing(false);
      setStatus('Preview Mix complete.');
      stopActiveAudio(activeAudioRef.current);
    };

    media.addEventListener('timeupdate', handleTimeUpdate);
    media.addEventListener('ended', handleEnded);
    return () => {
      media.removeEventListener('timeupdate', handleTimeUpdate);
      media.removeEventListener('ended', handleEnded);
    };
  }, [isPreviewing, mediaRef, sortedCues]);

  const startPreview = async () => {
    const media = mediaRef.current;
    if (!media) {
      setStatus('Load a track before previewing.');
      return;
    }
    firedRef.current = new Set(sortedCues.filter((cue) => getCueTime(cue) < media.currentTime - 0.1).map((cue) => cue.id));
    stopActiveAudio(activeAudioRef.current);
    setIsPreviewing(true);
    setStatus(`${sortedCues.length} sound cue${sortedCues.length === 1 ? '' : 's'} armed.`);
    try {
      await media.play();
    } catch (err) {
      setIsPreviewing(false);
      setStatus(err?.message || 'Preview could not start.');
    }
  };

  const stopPreview = () => {
    const media = mediaRef.current;
    if (media) media.pause();
    setIsPreviewing(false);
    setStatus('Preview Mix stopped.');
    stopActiveAudio(activeAudioRef.current);
  };

  const resetPreview = () => {
    const media = mediaRef.current;
    if (media) {
      media.pause();
      media.currentTime = 0;
    }
    firedRef.current = new Set();
    setIsPreviewing(false);
    setStatus('Preview Mix reset.');
    stopActiveAudio(activeAudioRef.current);
  };

  return (
    <section className="studio-panel studio-preview-panel">
      <div className="studio-panel-heading">
        <span className="studio-step">Step 5</span>
        <h3>Preview Mix</h3>
      </div>
      <div className="studio-action-row">
        <button type="button" className="btn-primary" onClick={startPreview} disabled={!cues.length || isPreviewing}>Play Preview Mix</button>
        <button type="button" className="btn-secondary" onClick={stopPreview}>Stop/Clear Sounds</button>
        <button type="button" className="btn-secondary" onClick={resetPreview}>Reset Preview</button>
      </div>
      <div className="studio-preview-status">{status}</div>
      {cues.length > 0 && (
        <div className="studio-quick-cues">
          {sortedCues.slice(0, 5).map((cue) => (
            <button type="button" key={cue.id} className="studio-mini-button" onClick={() => onPreviewCue(cue)}>
              {formatShortTime(getCueTime(cue))} {cue.label || cue.phrase}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function playCue(cue, activeAudio = []) {
  if (cue.cueType === 'stop ambience') {
    stopMatchingAudio(activeAudio, (item) => item.cueType === 'ambience');
    return;
  }
  if (cue.cueType === 'fade music') {
    fadeMatchingAudio(activeAudio, (item) => item.cueType === 'music' || item.cueType === 'intro/outro');
    return;
  }
  const src = resolveSoundSource(cue.soundSrc);
  if (!src) return;
  const audio = new Audio(src);
  const requestedVolume = Number(cue.volume);
  const targetVolume = Math.max(0, Math.min(1, Number.isFinite(requestedVolume) ? requestedVolume : 0.75));
  const duration = Math.max(0, Number(cue.duration) || 0);
  const trimStart = Math.max(0, Number(cue.trimStart) || 0);
  const playbackRate = Math.max(0.5, Math.min(2, Number(cue.playbackRate) || 1));
  const shouldLoop = cue.repeatMode === 'loop' && duration > 0;
  audio.volume = cue.fadeIn > 0 ? 0 : targetVolume;
  audio.playbackRate = playbackRate;
  const entry = { audio, cueType: cue.cueType, timers: [], stopped: false };
  activeAudio.push(entry);

  audio.addEventListener('ended', () => {
    if (shouldLoop && !entry.stopped) {
      try { audio.currentTime = trimStart; } catch (_) {}
      audio.play().catch(() => removeAudio(activeAudio, audio));
      return;
    }
    removeAudio(activeAudio, audio);
  });

  const startAudio = () => {
    if (trimStart > 0) {
      try { audio.currentTime = trimStart; } catch (_) {}
    }
    audio.play().then(() => {
      if (cue.fadeIn > 0) fadeAudio(audio, 0, targetVolume, cue.fadeIn * 1000);
      scheduleCueStop(cue, audio, entry, activeAudio, duration, trimStart, playbackRate);
    }).catch(() => removeAudio(activeAudio, audio));
  };

  if (audio.readyState >= 1) startAudio();
  else audio.addEventListener('loadedmetadata', startAudio, { once: true });
}

function scheduleCueStop(cue, audio, entry, activeAudio, duration, trimStart, playbackRate) {
  const fadeOut = Math.max(0, Number(cue.fadeOut) || 0);
  const naturalDuration = Number.isFinite(audio.duration) ? Math.max(0, (audio.duration - trimStart) / playbackRate) : 0;
  const playLength = duration || naturalDuration;
  if (fadeOut > 0 && playLength > 0) {
    entry.timers.push(window.setTimeout(() => {
      if (!entry.stopped) fadeAudio(audio, audio.volume, 0, fadeOut * 1000);
    }, Math.max(0, playLength - fadeOut) * 1000));
  }
  if (duration > 0) {
    entry.timers.push(window.setTimeout(() => {
      if (entry.stopped) return;
      audio.pause();
      removeAudio(activeAudio, audio);
    }, duration * 1000));
  }
}

function resolveSoundSource(src) {
  if (!src) return '';
  if (/^(https?:|blob:|data:)/i.test(src)) return src;
  const encoded = normalizeAudioUrl(src).replace(/^\/+/, '');
  const r2Base = typeof window !== 'undefined' ? window.__R2_PUBLIC_URL : '';
  if (r2Base) return `${r2Base.replace(/\/$/, '')}/${encoded}`;
  return `/${encoded}`;
}

function stopActiveAudio(activeAudio) {
  activeAudio.splice(0).forEach((entry) => stopEntry(entry));
}

function stopMatchingAudio(activeAudio, predicate) {
  activeAudio.filter(predicate).forEach((entry) => {
    stopEntry(entry);
    removeAudio(activeAudio, entry.audio);
  });
}

function fadeMatchingAudio(activeAudio, predicate) {
  activeAudio.filter(predicate).forEach(({ audio }) => {
    fadeAudio(audio, audio.volume, 0, 600, () => {
      audio.pause();
      removeAudio(activeAudio, audio);
    });
  });
}

function removeAudio(activeAudio, audio) {
  const index = activeAudio.findIndex((item) => item.audio === audio);
  if (index >= 0) {
    stopEntry(activeAudio[index]);
    activeAudio.splice(index, 1);
  }
}

function stopEntry(entry) {
  entry.stopped = true;
  entry.timers?.forEach((timer) => window.clearTimeout(timer));
  entry.timers = [];
  entry.audio.pause();
  entry.audio.currentTime = 0;
}

function fadeAudio(audio, from, to, durationMs, onDone) {
  const started = performance.now();
  const tick = () => {
    const progress = Math.min(1, (performance.now() - started) / Math.max(1, durationMs));
    audio.volume = from + (to - from) * progress;
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else if (onDone) {
      onDone();
    }
  };
  tick();
}

function formatShortTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  return `${Math.floor(safe / 60)}:${String(Math.floor(safe % 60)).padStart(2, '0')}`;
}
