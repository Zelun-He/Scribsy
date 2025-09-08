'use client';

import React, { useEffect, useRef, useState } from 'react';

type SpeechRecognitionType = any;

const Mic = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1a3 3 0 00-3 3v7a3 3 0 106 0V4a3 3 0 00-3-3z"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 10a7 7 0 01-14 0M12 21v-4"/>
  </svg>
);

const Pause = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h2v16h-2zM14 4h2v16h-2z"/>
  </svg>
);

const Play = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5v14l11-7z"/>
  </svg>
);

export default function DictationWidget() {
  const [isRecording, setIsRecording] = useState(false);
  const [level, setLevel] = useState(0); // 0..1
  const [words, setWords] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  const resetAudio = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (analyserRef.current) analyserRef.current.disconnect();
    analyserRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const tick = () => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const bufferLength = analyser.fftSize;
    const data = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / bufferLength);
    setLevel(Math.min(1, rms * 2));
    setElapsed(Math.floor((performance.now() - startTimeRef.current) / 1000));
    rafRef.current = requestAnimationFrame(tick);
  };

  const startRecognition = () => {
    const SR: any = (typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) || null;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (event: any) => {
      try {
        const transcript: string = Array.from(event.results)
          .map((r: any) => r[0]?.transcript || '')
          .join(' ');
        const wc = (transcript.trim().match(/\b\w+\b/g) || []).length;
        setWords(wc);
      } catch {}
    };
    rec.onend = () => {
      if (isRecording) {
        try { rec.start(); } catch {}
      }
    };
    recognitionRef.current = rec;
    try { rec.start(); } catch {}
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;
      startTimeRef.current = performance.now();
      setWords(0);
      setElapsed(0);
      setIsRecording(true);
      startRecognition();
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setIsRecording(false);
      resetAudio();
    }
  };

  const stop = () => {
    setIsRecording(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    resetAudio();
  };

  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-full border border-stone-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isRecording ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-stone-100 text-stone-700 dark:bg-[#1A1A1A] dark:text-gray-300'}`}>
        <Mic className="w-4 h-4" />
      </div>
      <div className="w-20 h-2 rounded-full bg-stone-100 dark:bg-[#1A1A1A] overflow-hidden">
        <div className="h-full bg-emerald-500 transition-[width] duration-150" style={{ width: `${Math.round(level * 100)}%` }} />
      </div>
      <div className="text-xs text-stone-600 dark:text-gray-300 tabular-nums">{mm}:{ss}</div>
      <div className="text-xs text-stone-600 dark:text-gray-300">{words} words</div>
      {!isRecording ? (
        <button onClick={start} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-stone-200 dark:border-gray-700 hover:bg-stone-50 dark:hover:bg-[#1A1A1A]">
          <Play className="w-3.5 h-3.5" /> Start
        </button>
      ) : (
        <button onClick={stop} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-stone-200 dark:border-gray-700 hover:bg-stone-50 dark:hover:bg-[#1A1A1A]">
          <Pause className="w-3.5 h-3.5" /> Pause
        </button>
      )}
    </div>
  );
}


