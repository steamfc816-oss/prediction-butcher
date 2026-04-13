import { useRef, useCallback, useState } from 'react';

export function useVideoExport() {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback((canvas: HTMLCanvasElement, audioStream?: MediaStream | null) => {
    chunksRef.current = [];

    const canvasStream = canvas.captureStream(30);

    // Mix audio into video stream if available
    let combinedStream = canvasStream;
    if (audioStream) {
      const tracks = [...canvasStream.getTracks(), ...audioStream.getTracks()];
      combinedStream = new MediaStream(tracks);
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 4_000_000,
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorderRef.current = recorder;
    recorder.start(100);
  }, []);

  const stopRecording = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder) {
        resolve('');
        return;
      }

      recorder.onstop = async () => {
        setExporting(true);
        setProgress(10);

        const webmBlob = new Blob(chunksRef.current, { type: 'video/webm' });

        try {
          // Try FFmpeg.wasm for MP4 conversion
          setProgress(30);
          const { FFmpeg } = await import('@ffmpeg/ffmpeg');
          const { fetchFile } = await import('@ffmpeg/util');
          
          const ffmpeg = new FFmpeg();
          
          ffmpeg.on('progress', ({ progress: p }) => {
            setProgress(30 + Math.floor(p * 60));
          });

          await ffmpeg.load({
            coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
            wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
          });
          
          setProgress(50);
          await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
          await ffmpeg.exec(['-i', 'input.webm', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac', '-movflags', '+faststart', 'output.mp4']);
          
          const data = await ffmpeg.readFile('output.mp4');
          const mp4Blob = new Blob([new Uint8Array(data as Uint8Array)], { type: 'video/mp4' });
          const url = URL.createObjectURL(mp4Blob);
          
          setProgress(100);
          setExporting(false);
          resolve(url);
        } catch (err) {
          console.warn('FFmpeg failed, falling back to WebM:', err);
          // Fallback to WebM
          const url = URL.createObjectURL(webmBlob);
          setProgress(100);
          setExporting(false);
          resolve(url);
        }
      };

      recorder.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  return { startRecording, stopRecording, cancelRecording, exporting, progress };
}
