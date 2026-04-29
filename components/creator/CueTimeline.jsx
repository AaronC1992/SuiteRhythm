'use client';

import { getCueRenderTime } from '../../lib/studio/cue-map';

export default function CueTimeline({ cues, onPreviewCue, onEditCue, onDeleteCue, onOffsetChange, onDurationChange }) {
  const sortedCues = [...cues].sort((a, b) => getCueTime(a) - getCueTime(b));

  return (
    <section className="studio-panel studio-timeline-panel">
      <div className="studio-panel-heading">
        <span className="studio-step">Step 4</span>
        <h3>Cue Timeline</h3>
      </div>
      {sortedCues.length ? (
        <div className="cue-timeline-list">
          {sortedCues.map((cue) => (
            <div key={cue.id} className="cue-timeline-item">
              <div className="cue-time">{formatTime(getCueTime(cue))}</div>
              <div className="cue-main">
                <strong>{cue.label || cue.phrase}</strong>
                <span>{cue.phrase}</span>
                <small>{formatCueDetails(cue)}</small>
              </div>
              <label className="cue-offset-field">
                <span>Offset</span>
                <input type="number" step="0.1" value={cue.offset || 0} onChange={(event) => onOffsetChange(cue.id, Number(event.target.value))} />
              </label>
              <label className="cue-offset-field">
                <span>Length</span>
                <input type="number" min="0" step="0.1" value={cue.duration || 0} onChange={(event) => onDurationChange(cue.id, Number(event.target.value))} />
              </label>
              <div className="cue-actions">
                <button type="button" className="sound-lib-preview" title="Preview cue" onClick={() => onPreviewCue(cue)}>Play</button>
                <button type="button" className="studio-mini-button" onClick={() => onEditCue(cue)}>Edit</button>
                <button type="button" className="studio-mini-button danger" onClick={() => onDeleteCue(cue.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="studio-empty-state">No sound cues yet.</div>
      )}
    </section>
  );
}

export function getCueTime(cue) {
  return getCueRenderTime(cue);
}

function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const tenths = Math.floor((safe % 1) * 10);
  return `${mins}:${String(secs).padStart(2, '0')}.${tenths}`;
}

function formatCueDetails(cue) {
  const parts = [cue.soundName || cue.cueType, cue.cueType, `${Math.round((cue.volume ?? 0) * 100)}%`];
  if (Number(cue.duration) > 0) parts.push(`${Number(cue.duration).toFixed(1)}s`);
  if (Number(cue.trimStart) > 0) parts.push(`start ${Number(cue.trimStart).toFixed(1)}s`);
  if (cue.repeatMode === 'loop') parts.push('loop');
  if (Number(cue.playbackRate) && Number(cue.playbackRate) !== 1) parts.push(`${Number(cue.playbackRate).toFixed(2)}x`);
  return parts.join(' - ');
}
