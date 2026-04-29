'use client';

import { useEffect, useMemo, useState } from 'react';

const CUE_TYPES = [
  'sound effect',
  'ambience',
  'music',
  'stinger',
  'intro/outro',
  'stop ambience',
  'fade music',
];

function defaultSoundForType(cueType, sounds) {
  const desired = cueType === 'ambience' || cueType === 'stop ambience' ? 'ambience'
    : cueType === 'music' || cueType === 'intro/outro' || cueType === 'fade music' ? 'music'
    : 'sfx';
  return sounds.find((sound) => sound.type === desired) || sounds[0] || null;
}

export default function SoundCueEditor({ selection, sounds, cueToEdit, onSave, onCancel }) {
  const selectedSound = useMemo(() => defaultSoundForType(cueToEdit?.cueType || 'sound effect', sounds), [cueToEdit, sounds]);
  const [form, setForm] = useState(() => createInitialForm(selection, cueToEdit, selectedSound));

  useEffect(() => {
    setForm(createInitialForm(selection, cueToEdit, selectedSound));
  }, [selection, cueToEdit, selectedSound]);

  const filteredSounds = useMemo(() => {
    if (form.cueType === 'stop ambience' || form.cueType === 'fade music') return sounds;
    const desired = form.cueType === 'ambience' ? 'ambience'
      : form.cueType === 'music' || form.cueType === 'intro/outro' ? 'music'
      : 'sfx';
    const matches = sounds.filter((sound) => sound.type === desired);
    return matches.length ? matches : sounds;
  }, [form.cueType, sounds]);

  useEffect(() => {
    if (!filteredSounds.length) return;
    if (filteredSounds.some((sound) => sound.id === form.soundId)) return;
    const nextSound = filteredSounds[0];
    setForm((current) => ({
      ...current,
      soundId: nextSound.id,
      soundName: nextSound.name,
      soundSrc: nextSound.src,
      soundCatalogType: nextSound.type,
    }));
  }, [filteredSounds, form.soundId]);

  if (!selection && !cueToEdit) {
    return (
      <section className="studio-panel studio-cue-editor-panel">
        <div className="studio-panel-heading">
          <span className="studio-step">Step 4</span>
          <h3>Sound Cues</h3>
        </div>
        <div className="studio-empty-state">Select Cue Words to create a sound cue.</div>
      </section>
    );
  }

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSoundChange = (soundId) => {
    const sound = sounds.find((item) => item.id === soundId);
    setForm((current) => ({
      ...current,
      soundId,
      soundName: sound?.name || '',
      soundSrc: sound?.src || '',
      soundCatalogType: sound?.type || 'sfx',
    }));
  };

  const canSave = form.phrase && (form.soundSrc || form.cueType === 'stop ambience' || form.cueType === 'fade music');

  return (
    <section className="studio-panel studio-cue-editor-panel">
      <div className="studio-panel-heading">
        <span className="studio-step">Step 4</span>
        <h3>Sound Cues</h3>
      </div>
      <div className="cue-editor-grid">
        <label>
          <span>Cue name/label</span>
          <input value={form.label} onChange={(event) => handleChange('label', event.target.value)} />
        </label>
        <label>
          <span>Selected word/phrase</span>
          <input value={form.phrase} onChange={(event) => handleChange('phrase', event.target.value)} />
        </label>
        <label>
          <span>Timestamp/start time</span>
          <input type="number" min="0" step="0.1" value={form.startTime} onChange={(event) => handleChange('startTime', Number(event.target.value))} />
        </label>
        <label>
          <span>Sound type</span>
          <select value={form.cueType} onChange={(event) => handleChange('cueType', event.target.value)}>
            {CUE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label className="cue-editor-wide">
          <span>Selected sound</span>
          <select value={form.soundId} onChange={(event) => handleSoundChange(event.target.value)} disabled={!filteredSounds.length || form.cueType === 'stop ambience' || form.cueType === 'fade music'}>
            {!filteredSounds.length && <option value="">No sounds loaded</option>}
            {filteredSounds.map((sound) => (
              <option key={sound.id} value={sound.id}>{sound.name} ({sound.type})</option>
            ))}
          </select>
        </label>
        <label>
          <span>Volume</span>
          <input type="range" min="0" max="1" step="0.05" value={form.volume} onChange={(event) => handleChange('volume', Number(event.target.value))} />
          <small>{Math.round(form.volume * 100)}%</small>
        </label>
        <label>
          <span>Delay/offset</span>
          <input type="number" step="0.1" value={form.offset} onChange={(event) => handleChange('offset', Number(event.target.value))} />
        </label>
        <label>
          <span>Fade in</span>
          <input type="number" min="0" step="0.1" value={form.fadeIn} onChange={(event) => handleChange('fadeIn', Number(event.target.value))} />
        </label>
        <label>
          <span>Fade out</span>
          <input type="number" min="0" step="0.1" value={form.fadeOut} onChange={(event) => handleChange('fadeOut', Number(event.target.value))} />
        </label>
      </div>
      <div className="studio-action-row align-right">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn-primary" disabled={!canSave} onClick={() => onSave(normalizeCue(form, cueToEdit?.id))}>
          {cueToEdit ? 'Update Cue' : 'Add Cue'}
        </button>
      </div>
    </section>
  );
}

function createInitialForm(selection, cueToEdit, selectedSound) {
  if (cueToEdit) return { ...cueToEdit };
  return {
    phrase: selection?.phrase || '',
    startTime: Number(selection?.startTime || 0).toFixed(1),
    endTime: selection?.endTime || selection?.startTime || 0,
    cueType: 'sound effect',
    soundId: selectedSound?.id || '',
    soundName: selectedSound?.name || '',
    soundSrc: selectedSound?.src || '',
    soundCatalogType: selectedSound?.type || 'sfx',
    volume: 0.75,
    offset: 0,
    fadeIn: 0,
    fadeOut: 0,
    label: selection?.phrase ? `${selection.phrase} cue` : 'Sound cue',
  };
}

function normalizeCue(form, existingId) {
  return {
    ...form,
    id: existingId || `cue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startTime: Number(form.startTime) || 0,
    endTime: Number(form.endTime) || Number(form.startTime) || 0,
    volume: Number(form.volume) || 0,
    offset: Number(form.offset) || 0,
    fadeIn: Number(form.fadeIn) || 0,
    fadeOut: Number(form.fadeOut) || 0,
  };
}
