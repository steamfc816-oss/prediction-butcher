import { useRef, useCallback, useState } from 'react';

export type ExportStatus = 'idle' | 'recording' | 'encoding' | 'done' | 'error';

export function useVideoExport() {
  const [status, setStatus]   = useState<ExportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [exporting, setExporting] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);

  /* ── Choose best supported mime type ─────────────────── */
  function getBestMime(): string {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    return candidates.find(m => MediaRecorder.isTypeSupported(m)) ?? 'video/webm';
  }

  /* ── Start recording ──────────────────────────────────── */
  const startRecording = useCallback((canvas: HTMLCanvasElement, audioStream?: MediaStream | null) => {
    chunksRef.current = [];
    setStatus('recording');
    setExporting(false);
    setProgress(0);

    const canvasStream = canvas.captureStream(30);
    const tracks = [...canvasStream.getTracks()];
    if (audioStream) tracks.push(...audioStream.getTracks());
    const combined = new MediaStream(tracks);

    const mime = getBestMime();
    const recorder = new MediaRecorder(combined, {
      mimeType: mime,
      videoBitsPerSecond: 5_000_000,
    });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorderRef.current = recorder;
    recorder.start(200); // collect chunks every 200ms
  }, []);

  /* ── Stop recording & encode ──────────────────────────── */
  const stopRecording = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve('');
        return;
      }

      recorder.onstop = async () => {
        setExporting(true);
        setStatus('encoding');
        setProgress(15);

        if (chunksRef.current.length === 0) {
          setStatus('error');
          setExporting(false);
          resolve('');
          return;
        }

        const webmBlob = new Blob(chunksRef.current, { type: 'video/webm' });

        /* ── Try FFmpeg WASM for MP4 ─────────────────────── */
        try {
          // Check SharedArrayBuffer availability (required for FFmpeg WASM threads)
          if (typeof SharedArrayBuffer === 'undefined') {
            throw new Error('SharedArrayBuffer not available — using WebM fallback');
          }

          setProgress(25);
          const { FFmpeg } = await import('@ffmpeg/ffmpeg');
          const { fetchFile } = await import('@ffmpeg/util');

          const ffmpeg = new FFmpeg();
          ffmpeg.on('progress', ({ progress: p }) => {
            setProgress(25 + Math.floor(p * 70));
          });

          setProgress(30);
          await ffmpeg.load({
            coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
            wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
          });

          setProgress(45);
          await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
          await ffmpeg.exec([
            '-i', 'input.webm',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '20',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-movflags', '+faststart',
            '-pix_fmt', 'yuv420p',
            'output.mp4',
          ]);

          const data = await ffmpeg.readFile('output.mp4');
          const mp4Blob = new Blob([new Uint8Array(data as Uint8Array)], { type: 'video/mp4' });
          const url = URL.createObjectURL(mp4Blob);
          setProgress(100);
          setStatus('done');
          setExporting(false);
          resolve(url);
          return;

        } catch (err) {
          console.warn('[VideoExport] FFmpeg/MP4 failed, using WebM:', err);
        }

        /* ── Fallback: serve WebM directly ───────────────── */
        setProgress(90);
        await new Promise(r => setTimeout(r, 200)); // small delay so UI updates
        const url = URL.createObjectURL(webmBlob);
        setProgress(100);
        setStatus('done');
        setExporting(false);
        resolve(url);
      };

      // Request remaining data then stop
      if (recorder.state === 'recording') {
        recorder.requestData();
        recorder.stop();
      } else {
        recorder.stop();
      }
    });
  }, []);

  const cancelRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    chunksRef.current = [];
    setStatus('idle');
    setExporting(false);
    setProgress(0);
  }, []);

  return {
    startRecording,
    stopRecording,
    cancelRecording,
    exporting,
    progress,
    status,
  };
}
