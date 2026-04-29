'use client';

function isSelected(index, selectedRange) {
  if (!selectedRange) return false;
  return index >= selectedRange.startIndex && index <= selectedRange.endIndex;
}

export default function TranscriptSelector({ transcriptItems, selectedRange, onSelectRange, onClearSelection, error, isLoading }) {
  const hasTranscript = transcriptItems.length > 0;

  const handleItemClick = (index) => {
    if (!selectedRange) {
      onSelectRange({ startIndex: index, endIndex: index });
      return;
    }
    if (index === selectedRange.startIndex && index === selectedRange.endIndex) {
      onClearSelection();
      return;
    }
    onSelectRange({
      startIndex: Math.min(selectedRange.startIndex, index),
      endIndex: Math.max(selectedRange.startIndex, index),
    });
  };

  return (
    <section className="studio-panel studio-transcript-panel">
      <div className="studio-panel-heading">
        <span className="studio-step">Step 3</span>
        <h3>Cue Words</h3>
      </div>
      {error && <div className="studio-error">{error}</div>}
      <div className={`studio-transcript${isLoading ? ' loading' : ''}`}>
        {hasTranscript ? transcriptItems.map((item, index) => (
          <button
            type="button"
            key={item.id || `${item.start}-${index}`}
            className={`studio-transcript-token${isSelected(index, selectedRange) ? ' selected' : ''}${item.type === 'phrase' ? ' phrase' : ''}`}
            onClick={() => handleItemClick(index)}
          >
            <span>{item.text}</span>
            <small>{formatTime(item.start)}</small>
          </button>
        )) : (
          <div className="studio-empty-state">Transcript appears here after transcription.</div>
        )}
      </div>
      {selectedRange && (
        <button type="button" className="studio-text-button" onClick={onClearSelection}>Clear selection</button>
      )}
    </section>
  );
}

function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
