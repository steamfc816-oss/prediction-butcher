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
    // Horn-like sound
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(220, ctx.currentTime);
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(330, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    if (destRef.current) gain.connect(destRef.current);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 1.5);
    osc2.start(ctx.currentTime);
    osc2.stop(ctx.currentTime + 1.5);
  }, []);

  const playBackground = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    // Simple bass drone for atmosphere
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
      setTimeout(() => osc.stop(), 600);
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
