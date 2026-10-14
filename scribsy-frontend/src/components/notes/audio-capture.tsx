'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MicrophoneIcon, StopIcon, CloudArrowUpIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import styles from './audio-capture.module.css';

type Phase = 'idle' | 'requesting' | 'recording' | 'stopping';
type Capture = {
  stream?: MediaStream;
  recorder?: MediaRecorder;
  chunks: Blob[];
  startedAt?: number;
  stoppedAt?: number;
  timer?: ReturnType<typeof setInterval>;
  context?: AudioContext;
};

function release(capture: Capture) {
  clearInterval(capture.timer);
  capture.stream?.getTracks().forEach(track => track.stop());
  void capture.context?.close().catch(() => {});
}

function microphoneError(error: unknown) {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Microphone access is blocked. Allow microphone access in your browser’s site settings, then try again.';
  if (name === 'NotFoundError') return 'No microphone was found. Connect a microphone, then try again.';
  if (name === 'NotReadableError' || name === 'AbortError') return 'Your microphone could not be opened. Check your device or close another app using it, then try again.';
  return 'Recording could not start. Check your microphone and try again, or upload an audio file.';
}

export function recordingTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const remainder = Math.floor(seconds % 60);
  return (hours ? `${String(hours).padStart(2, '0')}:` : '') + `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

interface AudioCaptureProps {
  audioFile: File | null;
  onAudioReady: (file: File) => void;
  onBusyChange: (busy: boolean) => void;
  onTranscribe: () => void;
  isTranscribing: boolean;
  disabled?: boolean;
  autoStart?: boolean;
}

export function AudioCapture({ audioFile, onAudioReady, onBusyChange, onTranscribe, isTranscribing, disabled = false, autoStart = false }: AudioCaptureProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const active = useRef<Capture | null>(null);
  const autoStarted = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const section = useRef<HTMLElement>(null);
  const player = useRef<HTMLAudioElement>(null);
  const onReadyRef = useRef(onAudioReady);
  useEffect(() => { onReadyRef.current = onAudioReady; }, [onAudioReady]);

  const busy = phase !== 'idle';
  useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);
  useEffect(() => {
    if (!audioFile) return;
    const url = URL.createObjectURL(audioFile);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioFile]);
  useEffect(() => () => {
    const capture = active.current;
    active.current = null;
    autoStarted.current = false;
    if (!capture) return;
    if (capture.recorder) {
      capture.recorder.onstop = null;
      capture.recorder.ondataavailable = null;
      capture.recorder.onerror = null;
      capture.recorder.onstart = null;
      if (capture.recorder.state !== 'inactive') capture.recorder.stop();
    }
    release(capture);
  }, []);

  const stop = useCallback(() => {
    const capture = active.current;
    if (!capture) return;
    // A permission request cannot be dismissed programmatically. Discard its
    // stream if it resolves after cancellation or navigation.
    if (!capture.recorder) {
      active.current = null;
      setPhase('idle');
      return;
    }
    if (capture.recorder.state === 'inactive') return;
    capture.stoppedAt = performance.now();
    if (capture.startedAt !== undefined) setElapsed(Math.floor((capture.stoppedAt - capture.startedAt) / 1000));
    clearInterval(capture.timer);
    setPhase('stopping');
    capture.recorder.stop();
  }, []);

  const start = useCallback(async () => {
    if (active.current) return;
    setError('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('Microphone recording requires a secure connection (HTTPS). Open Scribsy directly in your browser, or upload an audio file.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setError('This browser does not support audio recording. Try a current version of Chrome, Safari, Firefox, or Edge, or upload audio.');
      return;
    }
    const capture: Capture = { chunks: [] };
    active.current = capture;
    setPhase('requesting');
    setElapsed(0);
    setLevel(0);
    setMuted(false);
    player.current?.pause();
    section.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (active.current !== capture) { stream.getTracks().forEach(track => track.stop()); return; }
      capture.stream = stream;
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      capture.recorder = recorder;
      recorder.ondataavailable = event => { if (event.data.size) capture.chunks.push(event.data); };
      recorder.onstart = () => {
        if (active.current !== capture) return;
        capture.startedAt = performance.now();
        setPhase('recording');
        let analyser: AnalyserNode | undefined;
        let samples: Uint8Array<ArrayBuffer> | undefined;
        try {
          const context = new AudioContext();
          capture.context = context;
          void context.resume().catch(() => {});
          analyser = context.createAnalyser();
          analyser.fftSize = 256;
          context.createMediaStreamSource(stream).connect(analyser);
          samples = new Uint8Array(analyser.fftSize);
        } catch { /* Recording still works when a browser cannot expose a meter. */ }
        capture.timer = setInterval(() => {
          if (active.current !== capture || capture.startedAt === undefined) return;
          setElapsed(Math.floor((performance.now() - capture.startedAt) / 1000));
          if (analyser && samples) {
            analyser.getByteTimeDomainData(samples);
            const rms = Math.sqrt(samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / samples.length);
            setLevel(Math.min(1, rms * 4));
          }
        }, 200);
      };
      recorder.onerror = () => {
        if (active.current !== capture) return;
        setError('Recording was interrupted. Any captured audio will appear below. Check it before continuing, or record again.');
        stop();
      };
      recorder.onstop = () => {
        release(capture);
        if (active.current !== capture) return;
        active.current = null;
        if (capture.startedAt !== undefined) setElapsed(Math.floor(((capture.stoppedAt ?? performance.now()) - capture.startedAt) / 1000));
        setPhase('idle');
        setLevel(0);
        setMuted(false);
        const type = recorder.mimeType || capture.chunks[0]?.type || 'audio/webm';
        const blob = new Blob(capture.chunks, { type });
        if (!blob.size) { setError('No audio was captured. Check your microphone and try again.'); return; }
        const extension = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
        onReadyRef.current(new File([blob], `recording.${extension}`, { type }));
      };
      stream.getAudioTracks().forEach(track => {
        track.addEventListener('mute', () => { if (active.current === capture) setMuted(true); });
        track.addEventListener('unmute', () => { if (active.current === capture) setMuted(false); });
        track.addEventListener('ended', () => {
          if (active.current !== capture) return;
          setError('The microphone disconnected. Check the captured audio below before continuing.');
          stop();
        });
      });
      recorder.start(1000);
    } catch (failure) {
      release(capture);
      if (active.current !== capture) return;
      active.current = null;
      setPhase('idle');
      setError(microphoneError(failure));
    }
  }, [stop]);

  useEffect(() => {
    if (autoStart && !disabled && !autoStarted.current) {
      autoStarted.current = true;
      void start();
    }
  }, [autoStart, disabled, start]);

  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [busy]);

  const upload = (file?: File) => {
    if (!file || busy || disabled || isTranscribing) return;
    if (!file.size) { setError('That audio file is empty. Choose another file.'); return; }
    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|webm|ogg|mp4|flac|aac)$/i.test(file.name)) {
      setError('Choose an audio file such as MP3, WAV, M4A, or WebM.'); return;
    }
    setError('');
    setElapsed(0);
    onReadyRef.current(file);
  };

  return (
    <section ref={section} className={styles.card} aria-labelledby="audio-capture-title">
      <div className={styles.header}>
        <div><h2 id="audio-capture-title">Record your visit</h2><p>Record a conversation or upload audio to create a note.</p></div>
        <MicrophoneIcon className={styles.icon} aria-hidden="true" />
      </div>
      <div className={`${styles.statusPanel} ${phase === 'recording' ? styles.active : ''}`}>
        <div>
          <p className={styles.status} role="status">
            <span className={`${styles.dot} ${phase === 'recording' ? styles.recordingDot : ''}`} aria-hidden="true" />
            {phase === 'requesting' ? 'Waiting for microphone access' : phase === 'recording' ? (muted ? 'Microphone interrupted' : 'Recording in progress') : phase === 'stopping' ? 'Preparing your recording' : audioFile ? 'Audio ready to review' : 'Ready to record'}
          </p>
          <p className={styles.hint}>{phase === 'requesting' ? 'Choose Allow in your browser’s microphone prompt.' : phase === 'recording' ? (muted ? 'Your microphone is not sending audio. Check your device.' : 'Microphone is on. Stop when your visit is complete.') : phase === 'stopping' ? 'Finishing the audio file…' : audioFile ? 'Listen below, then transcribe your audio.' : 'Allow microphone access when your browser asks.'}</p>
        </div>
        <div className={styles.clock}><span role="timer" aria-label="Recording duration" aria-live="off">{recordingTime(elapsed)}</span><span className={styles.clockLabel}>Recording time</span></div>
      </div>
      {phase === 'recording' && <div className={styles.meterRow}><span>Mic input</span><div className={styles.meter} role="meter" aria-label="Microphone input level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)}><span style={{ width: `${level * 100}%` }} /></div></div>}
      {phase === 'recording' && <aside className={styles.recordingDock} aria-label="Active recording controls">
        <span className={`${styles.dot} ${styles.recordingDot}`} aria-hidden="true" />
        <span>Recording</span><strong aria-label={`Elapsed recording time ${recordingTime(elapsed)}`}>{recordingTime(elapsed)}</strong>
        <Button type="button" variant="destructive" size="sm" onClick={stop} aria-label="Stop active recording"><StopIcon className={styles.buttonIcon} aria-hidden="true" />Stop</Button>
      </aside>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}>
        {phase === 'requesting' ? <Button type="button" variant="secondary" onClick={stop}>Cancel microphone request</Button> : busy ? <Button type="button" variant="destructive" onClick={stop} disabled={phase === 'stopping'}><StopIcon className={styles.buttonIcon} aria-hidden="true" />{phase === 'stopping' ? 'Finishing…' : 'Stop recording'}</Button> : <Button type="button" onClick={() => void start()} disabled={disabled || isTranscribing}><MicrophoneIcon className={styles.buttonIcon} aria-hidden="true" />{audioFile ? 'Record again' : 'Start recording'}</Button>}
        <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()} disabled={busy || disabled || isTranscribing}><CloudArrowUpIcon className={styles.buttonIcon} aria-hidden="true" />Upload audio</Button>
        <input ref={fileInput} type="file" aria-label="Upload audio file" accept="audio/*,.m4a,.webm" hidden disabled={busy || disabled || isTranscribing} onChange={event => { upload(event.target.files?.[0]); event.target.value = ''; }} />
      </div>
      {audioUrl && audioFile && <div className={styles.preview}>
        <div className={styles.previewHeading}><div><h3>Audio preview</h3><p className={styles.filename}>{audioFile.name}</p></div><a href={audioUrl} download={audioFile.name} aria-label="Download audio recording"><ArrowDownTrayIcon className={styles.icon} aria-hidden="true" /></a></div>
        <audio ref={player} aria-label="Recorded audio preview" src={audioUrl} controls preload="metadata" className={styles.player} />
        <Button type="button" onClick={onTranscribe} disabled={busy || disabled || isTranscribing} loading={isTranscribing} className="w-full">{isTranscribing ? 'Transcribing…' : 'Transcribe & generate SOAP note'}</Button>
      </div>}
    </section>
  );
}
