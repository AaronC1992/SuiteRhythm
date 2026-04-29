'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';

const ACCEPTED_MEDIA = 'audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/mp4,video/mp4,video/webm,.mp3,.wav,.ogg,.webm,.m4a,.mp4';

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Duration pending';
  const whole = Math.round(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function getMediaKind(file) {
  if (!file) return 'audio';
  if (file.type?.startsWith('video/') || /\.(mp4|webm)$/i.test(file.name)) return 'video';
  return 'audio';
}

const UploadRecorder = forwardRef(function UploadRecorder({ media, onMediaChange, onDurationChange }, mediaRef) {
  const inputRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => () => {
    clearInterval(timerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const handleFile = (file) => {
    if (!file) return;
    const isSupported = file.type?.startsWith('audio/') || file.type?.startsWith('video/') || /\.(mp3|wav|ogg|webm|m4a|mp4)$/i.test(file.name);
    if (!isSupported) {
      setError('Choose an audio file, or an MP4/WebM video file.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('Choose a file under 25 MB for this Studio Mode MVP.');
      return;
    }
    setError('');
    onMediaChange(file, getMediaKind(file));
  };

  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        clearInterval(timerRef.current);
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const recordedAt = new Date().toISOString().replace(/[:.]/g, '-');
        const file = new File([blob], `studio-recording-${recordedAt}.webm`, { type: mimeType });
        onMediaChange(file, 'audio');
      };

      recorder.start();
      setRecordSeconds(0);
      setIsRecording(true);
      timerRef.current = setInterval(() => setRecordSeconds((value) => value + 1), 1000);
    } catch (err) {
      setError(err?.message || 'Recording could not start.');
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  return (
    <section className="studio-panel studio-import-panel">
      <div className="studio-panel-heading">
        <span className="studio-step">Step 1</span>
        <h3>Import or Record</h3>
      </div>
      <div className="studio-action-row">
        <button type="button" className="btn-primary" onClick={() => inputRef.current?.click()}>Upload Track</button>
        <button type="button" className={isRecording ? 'btn-stop' : 'btn-secondary'} onClick={isRecording ? stopRecording : startRecording}>
          {isRecording ? 'Stop Recording' : 'Record New Track'}
        </button>
        {isRecording && <span className="studio-recording-time">{formatDuration(recordSeconds)}</span>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MEDIA}
        className="hidden"
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      {error && <div className="studio-error">{error}</div>}
      {media ? (
        <div className="studio-media-card">
          <div className="studio-media-meta">
            <strong>{media.name}</strong>
            <span>{media.kind === 'video' ? 'Video' : 'Audio'} track</span>
            <span>{formatDuration(media.duration)}</span>
          </div>
          {media.kind === 'video' ? (
            <video ref={mediaRef} src={media.url} controls onLoadedMetadata={(event) => onDurationChange(event.currentTarget.duration)} />
          ) : (
            <audio ref={mediaRef} src={media.url} controls onLoadedMetadata={(event) => onDurationChange(event.currentTarget.duration)} />
          )}
        </div>
      ) : (
        <div className="studio-empty-state">No track loaded.</div>
      )}
    </section>
  );
});

export default UploadRecorder;
