'use client';

import { getCueRenderTime } from '../../lib/studio/cue-map';

export default function CueTimeline({ cues, onPreviewCue, onEditCue, onDeleteCue, onOffsetChange }) {
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
                <small>{cue.soundName || cue.cueType} - {cue.cueType} - {Math.round((cue.volume || 0) * 100)}%</small>
              </div>
              <label className="cue-offset-field">
                <span>Offset</span>
                <input type="number" step="0.1" value={cue.offset || 0} onChange={(event) => onOffsetChange(cue.id, Number(event.target.value))} />
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
