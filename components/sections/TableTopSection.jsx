'use client';

/** Table Top Games section — dedicated screen for D&D / tabletop RPG mode. */
export default function TableTopSection() {
  return (
    <div id="tableTopSection" className="app-section hidden">
      <div className="section-header">
        <h2>Table Top Games</h2>
      </div>
      <div className="section-body">
        <p className="section-intro">
          Immersive soundscapes for D&amp;D, Pathfinder, and tabletop RPG sessions. SuiteRhythm listens to your game and plays contextual sounds automatically.
        </p>

        {/* Hidden mode button — auto-clicked by engine when entering this section */}
        <button className="mode-btn hidden" data-mode="dnd" data-auto-select="true" style={{ display: 'none' }}>D&amp;D</button>

        {/* Scene Presets Bar */}
        <div className="scene-presets-bar" id="tableTopPresetsBar" />

        {/* Context Input */}
        <div className="context-input-area">
          <label htmlFor="tableTopContextInput">Campaign Context (Optional)</label>
          <textarea
            id="tableTopContextInput"
            className="context-input-mirror"
            rows="3"
            placeholder="Example: 'A dark medieval dungeon crawl beneath a cursed castle' or 'A tavern scene in a bustling port city'"
          />
          <p className="info-text">
            Describe your setting, campaign, or current scene to help SuiteRhythm choose better sounds.
          </p>
        </div>

        {/* Audio Visualizer */}
        <section className="visualizer-section" id="tableTopVisualizerSection">
          <canvas id="tableTopVisualizer" className="visualizer-mirror" />
          <div className="status-row">
            <span className="mic-indicator" id="tableTopMicIndicator" />
            <div id="tableTopStatusText" className="status-text">Ready to listen...</div>
          </div>
        </section>

        {/* Control Buttons */}
        <section className="controls">
          <button className="btn-test section-test-mic">Test Microphone</button>
          <button className="btn-start section-start-btn">Start Listening</button>
          <button className="btn-stop hidden section-stop-btn">Stop Listening</button>
          <button className="btn-stop-audio section-stop-audio">Stop Audio</button>
        </section>

        {/* Session Stats */}
        <section className="session-stats" id="tableTopSessionStats">
          <div className="stat-item">
            <span className="stat-value" id="ttStatSounds">0</span>
            <span className="stat-label">Sounds</span>
          </div>
          <div className="stat-item">
            <span className="stat-value" id="ttStatTriggers">0</span>
            <span className="stat-label">Triggers</span>
          </div>
          <div className="stat-item">
            <span className="stat-value" id="ttStatMusic">0</span>
            <span className="stat-label">Music</span>
          </div>
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
