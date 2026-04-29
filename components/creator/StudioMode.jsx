'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import CueTimeline from './CueTimeline';
import PreviewMixer, { playCue } from './PreviewMixer';
import SoundCueEditor from './SoundCueEditor';
import TranscriptSelector from './TranscriptSelector';
import UploadRecorder from './UploadRecorder';

const STORAGE_KEY = 'SuiteRhythm_studio_cue_map';

export default function StudioMode({ active }) {
  const mediaRef = useRef(null);
  const importInputRef = useRef(null);
  const singleCueAudioRef = useRef([]);
  const [media, setMedia] = useState(null);
  const [soundCatalog, setSoundCatalog] = useState([]);
  const [soundError, setSoundError] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptItems, setTranscriptItems] = useState([]);
  const [transcriptText, setTranscriptText] = useState('');
  const [manualTranscript, setManualTranscript] = useState('');
  const [transcriptError, setTranscriptError] = useState('');
  const [selectedRange, setSelectedRange] = useState(null);
  const [cues, setCues] = useState([]);
  const [cueToEdit, setCueToEdit] = useState(null);
  const [savedAt, setSavedAt] = useState('');

  useEffect(() => {
    if (!active || soundCatalog.length) return;
    let cancelled = false;
    fetch('/api/sounds', { cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`Sound catalog returned ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        const serverSounds = Array.isArray(data?.sounds) ? data.sounds.map(normalizeSoundRecord) : [];
        const customSounds = loadCustomSounds();
        setSoundCatalog([...customSounds, ...serverSounds]);
        setSoundError('');
      })
      .catch((err) => {
        if (cancelled) return;
        setSoundError(err?.message || 'Sound catalog failed to load.');
      });
    return () => { cancelled = true; };
  }, [active, soundCatalog.length]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (Array.isArray(saved.cues)) setCues(saved.cues);
      if (Array.isArray(saved.transcriptItems)) setTranscriptItems(saved.transcriptItems);
      if (typeof saved.transcriptText === 'string') setTranscriptText(saved.transcriptText);
      if (saved.savedAt) setSavedAt(saved.savedAt);
    } catch (_) {}
  }, []);

  useEffect(() => () => {
    if (media?.url) URL.revokeObjectURL(media.url);
  }, [media?.url]);

  useEffect(() => () => stopAudioBucket(singleCueAudioRef.current), []);

  const selection = useMemo(() => {
    if (!selectedRange) return null;
    const items = transcriptItems.slice(selectedRange.startIndex, selectedRange.endIndex + 1);
    if (!items.length) return null;
    return {
      phrase: items.map((item) => item.text).join(' ').replace(/\s+([,.!?;:])/g, '$1'),
      startTime: items[0].start || 0,
      endTime: items[items.length - 1].end || items[0].end || items[0].start || 0,
    };
  }, [selectedRange, transcriptItems]);

  const handleMediaChange = (file, kind) => {
    setMedia((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return {
        file,
        kind,
        name: file.name,
        url: URL.createObjectURL(file),
        duration: 0,
      };
    });
    setSelectedRange(null);
    setCueToEdit(null);
    setTranscriptError('');
  };

  const handleDurationChange = (duration) => {
    setMedia((current) => current ? { ...current, duration } : current);
  };

  const transcribeTrack = async () => {
    if (!media?.file) {
      setTranscriptError('Load a track before transcribing.');
      return;
    }
    setIsTranscribing(true);
    setTranscriptError('');
    try {
      const formData = new FormData();
      formData.append('file', media.file);
      if (media.duration) formData.append('duration', String(media.duration));
      const token = await getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const response = await fetch('/api/transcribe', { method: 'POST', headers, body: formData });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `Transcription returned ${response.status}`);
      setTranscriptText(data.text || '');
      setTranscriptItems(Array.isArray(data.words) ? data.words : []);
      setSelectedRange(null);
    } catch (err) {
      setTranscriptError(err?.message || 'Transcription failed.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const useManualTranscript = () => {
    const items = buildFallbackTranscript(manualTranscript, media?.duration || 0);
    setTranscriptText(manualTranscript.trim());
    setTranscriptItems(items);
    setTranscriptError('');
    setSelectedRange(null);
  };

  const saveCue = (cue) => {
    setCues((current) => {
      const exists = current.some((item) => item.id === cue.id);
      return exists ? current.map((item) => item.id === cue.id ? cue : item) : [...current, cue];
    });
    setCueToEdit(null);
    setSelectedRange(null);
  };

  const saveCueMap = () => {
    const saved = new Date().toISOString();
    const cueMap = buildCueMap({ media, transcriptText, transcriptItems, cues, savedAt: saved });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cueMap));
    setSavedAt(saved);
  };

  const exportCueMap = () => {
    const cueMap = buildCueMap({ media, transcriptText, transcriptItems, cues, savedAt: new Date().toISOString() });
    const blob = new Blob([JSON.stringify(cueMap, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizeFileName(media?.name || 'studio-cue-map')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importCueMap = async (file) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.cues)) throw new Error('Cue map JSON is missing cues.');
      setCues(data.cues);
      setTranscriptItems(Array.isArray(data.transcriptItems) ? data.transcriptItems : []);
      setTranscriptText(typeof data.transcriptText === 'string' ? data.transcriptText : '');
      setSavedAt(data.savedAt || '');
      setTranscriptError('');
    } catch (err) {
      setTranscriptError(err?.message || 'Cue map import failed.');
    }
  };

  const deleteCue = (cueId) => setCues((current) => current.filter((cue) => cue.id !== cueId));
  const updateCueOffset = (cueId, offset) => setCues((current) => current.map((cue) => cue.id === cueId ? { ...cue, offset } : cue));
  const previewSingleCue = (cue) => {
    stopAudioBucket(singleCueAudioRef.current);
    playCue(cue, singleCueAudioRef.current);
  };

  return (
    <div className={`creator-mode-panel studio-mode${active ? '' : ' hidden'}`} role="tabpanel" aria-label="Studio Mode">
      <p className="section-intro">
        Upload or record a track, select words in the transcript, add sound cues, and preview before publishing.
      </p>
      <div className="studio-grid">
        <div className="studio-main-column">
          <UploadRecorder ref={mediaRef} media={media} onMediaChange={handleMediaChange} onDurationChange={handleDurationChange} />

          <section className="studio-panel studio-transcribe-panel">
            <div className="studio-panel-heading">
              <span className="studio-step">Step 2</span>
              <h3>Transcribe</h3>
            </div>
            <div className="studio-action-row">
              <button type="button" className="btn-primary" onClick={transcribeTrack} disabled={!media || isTranscribing}>
                {isTranscribing ? 'Transcribing...' : 'Transcribe Track'}
              </button>
              <span className="studio-muted-text">{transcriptItems.length ? `${transcriptItems.length} Cue Words ready` : 'No transcript loaded'}</span>
            </div>
            {transcriptError && <div className="studio-error">{transcriptError}</div>}
            <div className="manual-transcript-box">
              <textarea
                value={manualTranscript}
                rows="3"
                placeholder="Paste transcript text"
                onChange={(event) => setManualTranscript(event.target.value)}
              />
              <button type="button" className="btn-secondary" onClick={useManualTranscript} disabled={!manualTranscript.trim()}>Use Manual Transcript</button>
            </div>
          </section>

          <TranscriptSelector
            transcriptItems={transcriptItems}
            selectedRange={selectedRange}
            onSelectRange={setSelectedRange}
            onClearSelection={() => setSelectedRange(null)}
            isLoading={isTranscribing}
          />

          <CueTimeline
            cues={cues}
            onPreviewCue={previewSingleCue}
            onEditCue={setCueToEdit}
            onDeleteCue={deleteCue}
            onOffsetChange={updateCueOffset}
          />
        </div>

        <aside className="studio-side-column">
          {soundError && <div className="studio-error">{soundError}</div>}
          <SoundCueEditor
            selection={selection}
            sounds={soundCatalog}
            cueToEdit={cueToEdit}
            onSave={saveCue}
            onCancel={() => { setCueToEdit(null); setSelectedRange(null); }}
          />
          <PreviewMixer mediaRef={mediaRef} cues={cues} onPreviewCue={previewSingleCue} />
          <section className="studio-panel studio-export-panel">
            <div className="studio-panel-heading">
              <span className="studio-step">Step 6</span>
              <h3>Save/Export</h3>
            </div>
            <div className="studio-action-row stack">
              <button type="button" className="btn-primary" onClick={saveCueMap} disabled={!cues.length}>Save Cue Map</button>
              <button type="button" className="btn-secondary" onClick={exportCueMap} disabled={!cues.length}>Export Cue Map JSON</button>
              <button type="button" className="btn-secondary" onClick={() => importInputRef.current?.click()}>Import Cue Map JSON</button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  importCueMap(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </div>
            {savedAt && <div className="studio-muted-text">Saved {new Date(savedAt).toLocaleString()}</div>}
          </section>
        </aside>
      </div>
    </div>
  );
}

function normalizeSoundRecord(sound) {
  const type = sound?.type === 'music' ? 'music' : sound?.type === 'ambience' ? 'ambience' : 'sfx';
  const src = sound?.file || sound?.src || sound?.dataUrl || '';
  const name = sound?.name || src || 'Untitled sound';
  return {
    id: src || name,
    type,
    name,
    src,
    tags: sound?.keywords || sound?.tags || [],
  };
}

function loadCustomSounds() {
  try {
    const raw = JSON.parse(localStorage.getItem('SuiteRhythm_custom_sounds') || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.map((sound) => normalizeSoundRecord({ ...sound, type: 'sfx', src: sound.dataUrl }));
  } catch (_) {
    return [];
  }
}

async function getAuthToken() {
  try {
    const response = await fetch('/api/auth/token', { cache: 'no-cache' });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.token || null;
  } catch (_) {
    return null;
  }
}

function buildFallbackTranscript(text, duration) {
  const clean = text.trim();
  if (!clean) return [];
  const words = clean.match(/[\w'-]+|[^\s\w]/g) || [];
  const totalDuration = duration || Math.max(4, words.length * 0.42);
  const step = totalDuration / Math.max(1, words.length);
  return words.map((word, index) => ({
    id: `manual-${index}`,
    text: word,
    start: Number((index * step).toFixed(2)),
    end: Number(((index + 1) * step).toFixed(2)),
    type: 'word',
  }));
}

function buildCueMap({ media, transcriptText, transcriptItems, cues, savedAt }) {
  // TODO: Feed this cue map into a future server-side mixdown/video render pipeline.
  return {
    version: 1,
    mediaName: media?.name || '',
    mediaKind: media?.kind || '',
    mediaDuration: media?.duration || 0,
    transcriptText,
    transcriptItems,
    cues,
    savedAt,
  };
}

function sanitizeFileName(name) {
  return name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'studio-cue-map';
}

function stopAudioBucket(bucket) {
  bucket.splice(0).forEach(({ audio }) => {
    audio.pause();
    audio.currentTime = 0;
  });
}
