'use client';

/** Creator section — dedicated screen for Creator mode listening. */
export default function CreatorSection() {
  return (
    <div id="creatorSection" className="app-section hidden">
      <div className="section-header">
        <h2>Creator</h2>
      </div>
      <div className="section-body">
        <p className="section-intro">
          Background sounds and music for content creators — podcasts, streams, video production, and creative work.
        </p>

        {/* Hidden mode button — auto-clicked by engine when entering this section */}
        <button className="mode-btn hidden" data-mode="creator" data-auto-select="true" style={{ display: 'none' }}>Creator</button>

        {/* Scene Presets Bar */}
        <div className="scene-presets-bar" id="creatorPresetsBar" />

        {/* Context Input */}
        <div className="context-input-area">
          <label htmlFor="creatorContextInput">Context (Optional)</label>
          <textarea
            id="creatorContextInput"
            className="context-input-mirror"
            rows="3"
            placeholder="Example: 'Chill lo-fi podcast recording session' or 'High-energy gaming stream'"
          />
          <p className="info-text">
            Describe your content type or mood to help SuiteRhythm choose better sounds.
          </p>
        </div>

        {/* Audio Visualizer */}
        <section className="visualizer-section" id="creatorVisualizerSection">
          <canvas id="creatorVisualizer" className="visualizer-mirror" />
          <div className="status-row">
            <span className="mic-indicator" id="creatorMicIndicator" />
            <div id="creatorStatusText" className="status-text">Ready to listen...</div>
          </div>
        </section>

        {/* Control Buttons */}
        <section className="controls">
          <button className="btn-test section-test-mic">Test Microphone</button>
          <button className="btn-start section-start-btn">Start Listening</button>
          <button className="btn-stop hidden section-stop-btn">Stop Listening</button>
          <button className="btn-stop-audio section-stop-audio">Stop Audio</button>
        </section>

        {/* Currently Playing */}
        <section className="sounds-section">
          <h3>Currently Playing</h3>
          <div className="sounds-list section-current-sounds">
            <div className="sound-item inactive">No sounds playing</div>
          </div>
        </section>

        {/* Live Transcript */}
        <section className="transcript-section">
          <h3>What I&apos;m Hearing</h3>
          <div className="transcript-box section-transcript">Waiting for audio input...</div>
        </section>
      </div>
    </div>
  );
}
