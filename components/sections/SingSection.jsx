'use client';

/** Sing section — dedicated screen for Sing mode with backing music. */
export default function SingSection() {
  return (
    <div id="singSection" className="app-section hidden">
      <div className="section-header">
        <h2>Sing</h2>
      </div>
      <div className="section-body">
        <p className="section-intro">
          Start singing and SuiteRhythm will pick backing music that matches your tempo and energy. Headphones recommended so your mic doesn&apos;t pick up the music.
        </p>

        {/* Hidden mode button — auto-clicked by engine when entering this section */}
        <button className="mode-btn hidden" data-mode="sing" data-auto-select="true" style={{ display: 'none' }}>Sing</button>

        {/* Audio Visualizer */}
        <section className="visualizer-section" id="singVisualizerSection">
          <canvas id="singVisualizer" className="visualizer-mirror" />
          <div className="status-row">
            <span className="mic-indicator" id="singMicIndicator" />
            <div id="singStatusText" className="status-text">Ready to listen...</div>
          </div>
        </section>

        {/* Control Buttons */}
        <section className="controls">
          <button className="btn-test section-test-mic">Test Microphone</button>
          <button className="btn-start section-start-btn">Start Listening</button>
          <button className="btn-stop hidden section-stop-btn">Stop Listening</button>
          <button className="btn-stop-audio section-stop-audio">Stop Audio</button>
        </section>

        {/* Sing Stats */}
        <div className="sing-stats" style={{ marginTop: 16 }}>
          <div className="stat-item">
            <span className="stat-value" id="singSectionBpmReadout">— BPM</span>
            <span className="stat-label">Detected Tempo</span>
          </div>
          <div className="stat-item">
            <span className="stat-value" id="singSectionStateReadout">idle</span>
            <span className="stat-label">State</span>
          </div>
        </div>

        {/* Sing Options */}
        <div style={{ marginTop: 16 }}>
          <div className="toggle-row" style={{ marginTop: 8 }}>
            <label htmlFor="singSectionApplauseToggle">Applause on song end</label>
            <label className="switch">
              <input type="checkbox" id="singSectionApplauseToggle" className="sing-applause-mirror" defaultChecked />
              <span className="slider" />
            </label>
          </div>
          <p className="info-text" style={{ fontSize: '0.78rem', marginTop: 0 }}>
            Plays a crowd applause cue after ~6s of silence following a sustained song.
          </p>
          <div className="toggle-row" style={{ marginTop: 8 }}>
            <label htmlFor="singSectionStageFeelToggle">Live stage feel</label>
            <label className="switch">
              <input type="checkbox" id="singSectionStageFeelToggle" className="sing-stage-mirror" />
              <span className="slider" />
            </label>
          </div>
          <p className="info-text" style={{ fontSize: '0.78rem', marginTop: 0 }}>
            Occasional quiet crowd cheers/whistles mid-song, like a live gig. Off = silent audience.
          </p>
        </div>

        {/* Currently Playing */}
        <section className="sounds-section">
          <h3>Currently Playing</h3>
          <div className="sounds-list section-current-sounds">
            <div className="sound-item inactive">No sounds playing</div>
          </div>
        </section>
      </div>
    </div>
  );
}
