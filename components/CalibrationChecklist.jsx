'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'SuiteRhythm_calibration_complete_v1';

export default function CalibrationChecklist() {
  const [visible, setVisible] = useState(false);
  const [micStatus, setMicStatus] = useState('pending');
  const [speakerStatus, setSpeakerStatus] = useState('pending');

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(STORAGE_KEY) !== '1');
    } catch (_) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const complete = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (_) {}
    setVisible(false);
  };

  const dismissForNow = () => {
    setVisible(false);
  };

  const checkMic = async () => {
    setMicStatus('checking');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone unavailable');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      stream.getTracks().forEach((track) => track.stop());
      setMicStatus('ready');
    } catch (_) {
      setMicStatus('blocked');
    }
  };

  const testSpeaker = async () => {
    setSpeakerStatus('checking');
    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) throw new Error('Audio unavailable');
      const context = new AudioContextCtor();
      if (context.state === 'suspended') await context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 660;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.34);
      setTimeout(() => context.close().catch(() => {}), 500);
      setSpeakerStatus('ready');
    } catch (_) {
      setSpeakerStatus('blocked');
    }
  };

  const readyCount = [micStatus, speakerStatus].filter((status) => status === 'ready').length;

  return (
    <section className="calibration-strip" aria-label="Quick calibration">
      <div className="calibration-copy">
        <strong>Quick Calibration</strong>
        <span>{readyCount}/2 checks ready</span>
      </div>
      <div className="calibration-actions">
        <button type="button" className={`calibration-check ${micStatus}`} onClick={checkMic}>
          <span>Mic</span>
          <small>{labelFor(micStatus)}</small>
        </button>
        <button type="button" className={`calibration-check ${speakerStatus}`} onClick={testSpeaker}>
          <span>Speaker</span>
          <small>{labelFor(speakerStatus)}</small>
        </button>
        <button type="button" className="btn-secondary calibration-dismiss" onClick={dismissForNow}>Later</button>
        <button type="button" className="btn-primary calibration-done" onClick={complete}>Done</button>
      </div>
    </section>
  );
}

function labelFor(status) {
  if (status === 'checking') return 'Checking';
  if (status === 'ready') return 'Ready';
  if (status === 'blocked') return 'Blocked';
  return 'Check';
}
