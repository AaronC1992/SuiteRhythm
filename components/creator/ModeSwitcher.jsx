'use client';

export default function ModeSwitcher({ activeMode, onChange }) {
  return (
    <div className="creator-mode-switcher" role="tablist" aria-label="Creator modes">
      <button
        type="button"
        role="tab"
        aria-selected={activeMode === 'live'}
        className={`creator-mode-tab${activeMode === 'live' ? ' active' : ''}`}
        onClick={() => onChange('live')}
      >
        <span>Live Mode</span>
        <small>Trigger sounds, music, and ambience in real time while recording or streaming.</small>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeMode === 'studio'}
        className={`creator-mode-tab${activeMode === 'studio' ? ' active' : ''}`}
        onClick={() => onChange('studio')}
      >
        <span>Studio Mode</span>
        <small>Upload or record a track, select words in the transcript, add sound cues, and preview before publishing.</small>
      </button>
    </div>
  );
}
