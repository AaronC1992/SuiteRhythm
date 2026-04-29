'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getCueTime } from './CueTimeline';

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
  const targetVolume = Math.max(0, Math.min(1, Number(cue.volume) || 0.75));
  audio.volume = cue.fadeIn > 0 ? 0 : targetVolume;
  const entry = { audio, cueType: cue.cueType };
  activeAudio.push(entry);
  audio.addEventListener('ended', () => removeAudio(activeAudio, audio), { once: true });
  audio.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(audio.duration) && cue.fadeOut > 0) {
      const delayMs = Math.max(0, (audio.duration - cue.fadeOut) * 1000);
      window.setTimeout(() => fadeAudio(audio, audio.volume, 0, cue.fadeOut * 1000), delayMs);
    }
  });
  audio.play().then(() => {
    if (cue.fadeIn > 0) fadeAudio(audio, 0, targetVolume, cue.fadeIn * 1000);
  }).catch(() => removeAudio(activeAudio, audio));
}

function resolveSoundSource(src) {
  if (!src) return '';
  if (/^(https?:|blob:|data:)/i.test(src)) return src;
  const encoded = encodeURI(src).replace(/^\/+/, '');
  const r2Base = typeof window !== 'undefined' ? window.__R2_PUBLIC_URL : '';
  if (r2Base) return `${r2Base.replace(/\/$/, '')}/${encoded}`;
  return `/${encoded}`;
}

function stopActiveAudio(activeAudio) {
  activeAudio.splice(0).forEach(({ audio }) => {
    audio.pause();
    audio.currentTime = 0;
  });
}

function stopMatchingAudio(activeAudio, predicate) {
  activeAudio.filter(predicate).forEach(({ audio }) => {
    audio.pause();
    audio.currentTime = 0;
    removeAudio(activeAudio, audio);
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
  if (index >= 0) activeAudio.splice(index, 1);
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
