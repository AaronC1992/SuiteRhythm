'use client';

/** Story Teller section — dedicated screen for story-driven modes (Horror, Bedtime, Fairytale, Christmas, Halloween). */
export default function StoryTellerSection() {
  return (
    <div id="storyTellerSection" className="app-section hidden">
      <div className="section-header">
        <h2>Story Teller</h2>
      </div>
      <div className="section-body">
        <p className="section-intro">
          Pick a genre and start telling your story. SuiteRhythm will listen and play sounds, music, and ambience that match the mood.
        </p>

        {/* Genre Mode Selector */}
        <div className="mode-selector">
          <h3>Genre</h3>
          <div className="mode-buttons">
            {[
              { mode: 'horror', label: 'Horror' },
              { mode: 'bedtime', label: 'Bedtime' },
              { mode: 'fairytale', label: 'Fairytale' },
              { mode: 'christmas', label: 'Christmas' },
              { mode: 'halloween', label: 'Halloween' },
            ].map(({ mode, label }) => (
              <button
                key={mode}
                className={`mode-btn${mode === 'horror' ? ' active' : ''}`}
                data-mode={mode}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Scene Presets Bar */}
        <div className="scene-presets-bar" id="storyTellerPresetsBar" />

        {/* Context Input */}
        <div className="context-input-area">
          <label htmlFor="storyTellerContextInput">Story Context (Optional)</label>
          <textarea
            id="storyTellerContextInput"
            className="context-input-mirror"
            rows="3"
            placeholder="Example: 'A spooky haunted house on a stormy night' or 'A cozy bedtime story about a friendly dragon'"
          />
          <p className="info-text">
            Describe the setting or mood to help SuiteRhythm choose better sounds.
          </p>
        </div>

        {/* Audio Visualizer */}
        <section className="visualizer-section" id="storyTellerVisualizerSection">
          <canvas id="storyTellerVisualizer" className="visualizer-mirror" />
          <div className="status-row">
            <span className="mic-indicator" id="storyTellerMicIndicator" />
            <div id="storyTellerStatusText" className="status-text">Ready to listen...</div>
          </div>
        </section>

        {/* Control Buttons */}
        <section className="controls">
          <button className="btn-test section-test-mic">Test Microphone</button>
          <button className="btn-start section-start-btn">Start Listening</button>
          <button className="btn-stop hidden section-stop-btn">Stop Listening</button>
          <button className="btn-stop-audio section-stop-audio">Stop Audio</button>
        </section>

        {/* Bedtime auto fade-out */}
        <section className="bedtime-timer-panel" style={{ margin: '12px 0' }}>
          <label htmlFor="storyTellerBedtimeTimer" style={{ marginRight: 8 }}>Bedtime fade-out:</label>
          <select id="storyTellerBedtimeTimer" className="bedtime-timer-mirror" defaultValue="0">
            <option value="0">Off</option>
            <option value="5">5 min</option>
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="60">60 min</option>
            <option value="90">90 min</option>
          </select>
          <span className="info-text" style={{ marginLeft: 8 }}>
            Master fades over the final 60s, then stops all audio.
          </span>
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
