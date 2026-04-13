import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import SimulationCanvas, { type SimulationCanvasHandle, type TeamData } from '@/components/SimulationCanvas';
import TeamConfig from '@/components/TeamConfig';
import MatchConfig from '@/components/MatchConfig';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useVideoExport } from '@/hooks/useVideoExport';
import { Play, Square, Download, Loader2 } from 'lucide-react';

const Index = () => {
  const canvasHandleRef = useRef<SimulationCanvasHandle>(null);
  const [running, setRunning] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const [teamA, setTeamA] = useState<TeamData>({ name: 'Équipe A', color: '#a855f7', image: null });
  const [teamB, setTeamB] = useState<TeamData>({ name: 'Équipe B', color: '#3b82f6', image: null });
  const [competition, setCompetition] = useState('Ligue des Champions');

  const audio = useAudioEngine();
  const video = useVideoExport();
  const stopBgRef = useRef<(() => void) | null>(null);
  const isRecordingRef = useRef(false);

  const handleStart = useCallback(() => {
    setDownloadUrl(null);
    audio.init();
    setRunning(true);
    stopBgRef.current = audio.playBackground() ?? null;
  }, [audio]);

  const handleStop = useCallback(() => {
    setRunning(false);
    stopBgRef.current?.();
    audio.destroy();
    if (isRecordingRef.current) {
      isRecordingRef.current = false;
      video.stopRecording().then(url => {
        if (url) setDownloadUrl(url);
      });
    }
  }, [audio, video]);

  const handleExport = useCallback(async () => {
    setDownloadUrl(null);
    audio.init();
    const canvas = canvasHandleRef.current?.getCanvas();
    if (!canvas) return;

    const audioStream = audio.getAudioStream();
    video.startRecording(canvas, audioStream);
    isRecordingRef.current = true;

    setRunning(true);
    stopBgRef.current = audio.playBackground() ?? null;

    // Auto-stop after 60 seconds (match runs ~60s for 90 simulated minutes)
    setTimeout(() => {
      handleStop();
    }, 62000);
  }, [audio, video, handleStop]);

  const handleBounce = useCallback(() => {
    audio.playBounce();
  }, [audio]);

  const handleGoal = useCallback(() => {
    audio.playGoal();
  }, [audio]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 gap-4">
      {/* Title */}
      <h1 className="text-2xl font-bold text-foreground tracking-tight">
        <span className="text-primary">Foot</span>Sim
        <span className="text-accent ml-1 text-sm font-normal">Video Generator</span>
      </h1>

      {/* Canvas */}
      <SimulationCanvas
        ref={canvasHandleRef}
        teamA={teamA}
        teamB={teamB}
        competition={competition}
        running={running}
        onBounce={handleBounce}
        onGoal={handleGoal}
      />

      {/* Controls */}
      <div className="flex gap-2 w-full max-w-[360px]">
        {!running ? (
          <Button onClick={handleStart} className="flex-1 gap-2" variant="default">
            <Play className="w-4 h-4" /> Lancer Simulation
          </Button>
        ) : (
          <Button onClick={handleStop} className="flex-1 gap-2" variant="destructive">
            <Square className="w-4 h-4" /> Arrêter
          </Button>
        )}
      </div>

      {/* Config panels */}
      <div className="w-full max-w-[360px] space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <TeamConfig
            label="Équipe A"
            name={teamA.name}
            color={teamA.color}
            onNameChange={(name) => setTeamA(p => ({ ...p, name }))}
            onColorChange={(color) => setTeamA(p => ({ ...p, color }))}
            onImageChange={(image) => setTeamA(p => ({ ...p, image }))}
          />
          <TeamConfig
            label="Équipe B"
            name={teamB.name}
            color={teamB.color}
            onNameChange={(name) => setTeamB(p => ({ ...p, name }))}
            onColorChange={(color) => setTeamB(p => ({ ...p, color }))}
            onImageChange={(image) => setTeamB(p => ({ ...p, image }))}
          />
        </div>
        <MatchConfig competition={competition} onCompetitionChange={setCompetition} />
      </div>

      {/* Export */}
      <div className="w-full max-w-[360px] space-y-2">
        <Button
          onClick={handleExport}
          className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90 font-bold text-base h-12"
          disabled={running || video.exporting}
        >
          {video.exporting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Encodage MP4...</>
          ) : (
            <><Download className="w-5 h-5" /> Générer Vidéo Finale (MP4)</>
          )}
        </Button>

        {video.exporting && (
          <Progress value={video.progress} className="h-2" />
        )}

        {downloadUrl && (
          <a
            href={downloadUrl}
            download="footsim-match.mp4"
            className="block w-full text-center py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors"
          >
            📥 Télécharger la vidéo
          </a>
        )}
      </div>
    </div>
  );
};

export default Index;
