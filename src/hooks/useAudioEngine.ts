import { useRef, useCallback } from 'react';

export function useAudioEngine() {
  const ctxRef = useRef<AudioContext | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  const init = useCallback(() => {
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const dest = ctx.createMediaStreamDestination();
    destRef.current = dest;
    return { ctx, dest };
  }, []);

  const playBounce = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (destRef.current) gain.connect(destRef.current);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  }, []);

  const playGoal = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    
    // Epic stadium horn + crowd cheer
    // 1. Goal Horn
    const hornBase = 150;
    const createHornVoice = (freqMult: number, detuneFreq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(hornBase * freqMult, ctx.currentTime);
        osc.detune.setValueAtTime(detuneFreq, ctx.currentTime);
        
        gain.gain.setValueAtTime(0.0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.4, ctx.currentTime + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (destRef.current) gain.connect(destRef.current);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 2.5);
    };

    // Fat chord for horn
    createHornVoice(1, 0);     // Root
    createHornVoice(1.5, 5);   // Fifth
    createHornVoice(2, -5);    // Octave
    createHornVoice(1, 12);    // Detuned thickness

    // 2. Crowd Noise (Filtered noise)
    const bufferSize = ctx.sampleRate * 3; // 3 seconds of noise
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(800, ctx.currentTime);
    noiseFilter.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 1.5);
    noiseFilter.Q.value = 0.5;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, ctx.currentTime);
    noiseGain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.5);
    noiseGain.gain.setValueAtTime(0.8, ctx.currentTime + 2.0);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 3.0);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    if (destRef.current) noiseGain.connect(destRef.current);

    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 3.0);
  }, []);

  const playBackground = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, ctx.currentTime);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, ctx.currentTime);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    if (destRef.current) gain.connect(destRef.current);
    osc.start(ctx.currentTime);
    return () => {
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      setTimeout(() => { try { osc.stop(); } catch(e){} }, 600);
    };
  }, []);

  const getAudioStream = useCallback(() => {
    return destRef.current?.stream ?? null;
  }, []);

  const destroy = useCallback(() => {
    ctxRef.current?.close();
    ctxRef.current = null;
    destRef.current = null;
  }, []);

  return { init, playBounce, playGoal, playBackground, getAudioStream, destroy };
}
