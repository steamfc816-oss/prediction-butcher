import React, { useState, useRef, useCallback } from 'react';
import SimulationCanvas, { type SimulationCanvasHandle, type TeamData } from '@/components/SimulationCanvas';
import { useAudioEngine } from '@/hooks/useAudioEngine';

/* ── CrimeTape divider ─────────────────────────────────── */
function CrimeTape({ label }: { label: string }) {
  return (
    <div className="crime-tape my-1 rounded">
      <div className="crime-tape-inner">
        <span className="crime-tape-text">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i}>{label} &nbsp;🔪&nbsp; </span>
          ))}
        </span>
      </div>
    </div>
  );
}

/* ── Meat Tag Team Panel ────────────────────────────────── */
function MeatTagPanel({
  teamLetter, data, onChange,
}: {
  teamLetter: 'A' | 'B';
  data: TeamData;
  onChange: (patch: Partial<TeamData>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => onChange({ image: img });
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  return (
    <div className="meat-tag pt-6 space-y-2">
      {/* Team badge */}
      <div className="flex items-center justify-between mb-1">
        <span
          className="font-bebas text-xs tracking-widest"
          style={{ color: data.color, textShadow: `0 0 8px ${data.color}40` }}
        >
          ÉQUIPE {teamLetter}
        </span>
        <input
          type="color"
          value={data.color}
          onChange={e => onChange({ color: e.target.value })}
          className="w-5 h-5 rounded-full cursor-pointer border-0 p-0 opacity-80"
          title="Couleur"
        />
      </div>

      {/* Team name input */}
      <input
        type="text"
        value={data.name}
        onChange={e => onChange({ name: e.target.value })}
        placeholder={`Ex: PSG`}
        className="w-full"
      />

      {/* Logo upload */}
      <input type="file" ref={fileRef} accept="image/*" onChange={handleFile} className="hidden" />
      <button
        onClick={() => fileRef.current?.click()}
        className="w-full text-[11px] py-1 rounded border border-dashed border-amber-900/40 text-amber-900/60 hover:border-red-700 hover:text-red-700 transition-colors font-semibold"
      >
        {data.image ? '✓ Logo chargé' : '+ Logo'}
      </button>

      {/* Goal minutes */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-amber-900/50 mb-0.5">Buts (min.)</p>
        <input
          type="text"
          value={data.scriptedGoals || ''}
          onChange={e => onChange({ scriptedGoals: e.target.value })}
          placeholder="23, 67, 88"
          className="w-full"
        />
      </div>
    </div>
  );
}

/* ── League data ─────────────────────────────────────────── */
const LEAGUES = [
  { id: 'ucl',  name: 'UEFA Champions League',  country: 'Europe',     flag: '🏆' },
  { id: 'uel',  name: 'UEFA Europa League',      country: 'Europe',     flag: '🥈' },
  { id: 'pl',   name: 'Premier League',          country: 'Angleterre', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'liga', name: 'LaLiga',                  country: 'Espagne',    flag: '🇪🇸' },
  { id: 'bund', name: 'Bundesliga',              country: 'Allemagne',  flag: '🇩🇪' },
  { id: 'sa',   name: 'Serie A',                 country: 'Italie',     flag: '🇮🇹' },
  { id: 'l1',   name: 'Ligue 1',                 country: 'France',     flag: '🇫🇷' },
  { id: 'spl',  name: 'Saudi Pro League',        country: 'Arabie',     flag: '🇸🇦' },
  { id: 'bra',  name: 'Série A Brasileira',      country: 'Brésil',     flag: '🇧🇷' },
] as const;

/* ── Main Page ───────────────────────────────────────────── */
const Index = () => {
  const canvasRef = useRef<SimulationCanvasHandle>(null);
  const [running, setRunning] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const [teamA, setTeamA] = useState<TeamData>({
    name: 'Équipe A', color: '#dc2626', image: null, scriptedGoals: '',
  });
  const [teamB, setTeamB] = useState<TeamData>({
    name: 'Équipe B', color: '#3b82f6', image: null, scriptedGoals: '',
  });
  const [competition, setCompetition] = useState('UEFA Champions League');
  const [customCompetition, setCustomCompetition] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const audio = useAudioEngine();
  const stopBgRef = useRef<(() => void) | null>(null);

  const handleStart = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    audio.init();
    setRunning(true);
    stopBgRef.current = audio.playBackground() ?? null;
  }, [audio]);

  const handleStop = useCallback(() => {
    setRunning(false);
    stopBgRef.current?.();
    audio.destroy();
  }, [audio]);

  const handleBounce = useCallback(() => audio.playBounce(), [audio]);
  const handleGoal = useCallback(() => audio.playGoal(), [audio]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="w-full max-w-[420px] px-4 pt-5 pb-0">
        <div className="flex items-center gap-3 mb-3">
          {/* Logo with meat tag string style */}
          <div className="relative">
            <img
              src="/logo.png"
              alt="Logo"
              className={`w-11 h-11 rounded-full object-cover ring-2 ring-red-700/70 shadow-lg shadow-red-900/40 ${isShaking ? 'animate-shake' : ''}`}
            />
          </div>

          {/* Title */}
          <div className="flex-1">
            <h1 className="font-bebas text-2xl tracking-wider text-white leading-none animate-glitch">
              The Prediction <span className="text-red-500">Butcher</span>
            </h1>
            <p className="text-[9px] text-red-800/80 mt-0.5 tracking-[0.25em] uppercase font-bold">
              ⚔️ Simulations de Match • Short Generator
            </p>
          </div>

          {/* Format badge */}
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[8px] font-black px-2 py-0.5 rounded-sm bg-red-950/70 text-red-400 border border-red-800/40 tracking-widest font-bebas">
              9:16
            </span>
            <span className="text-[7px] text-muted-foreground tracking-widest">SHORT</span>
          </div>
        </div>

        {/* Blood drip bar */}
        <div className="blood-drip-bar" />
        <div className="h-3" />
      </header>

      {/* ── Canvas preview ─────────────────────────────────── */}
      <div className="w-full max-w-[420px] px-4 mb-3">
        <SimulationCanvas
          ref={canvasRef}
          teamA={teamA}
          teamB={teamB}
          competition={competition}
          running={running}
          onBounce={handleBounce}
          onGoal={handleGoal}
        />
      </div>

      {/* ── Action buttons ─────────────────────────────────── */}
      <div className="w-full max-w-[420px] px-4 flex gap-2">
        {!running ? (
          <button
            onClick={handleStart}
            className="w-full h-12 rounded btn-slash animate-pulse-red flex items-center justify-center gap-2"
          >
            🔪 TRANCHER LE MATCH
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="w-full h-12 rounded btn-stop flex items-center justify-center gap-2"
          >
            ⬛ ARRÊTER
          </button>
        )}
      </div>

      {/* ── Config ─────────────────────────────────────────── */}
      <div className="w-full max-w-[420px] px-4 mt-4 space-y-3 pb-10">

        {/* Crime tape: Teams */}
        <CrimeTape label="ÉQUIPES" />

        {/* Meat-tag team panels */}
        <div className="grid grid-cols-2 gap-5 pt-4">
          <MeatTagPanel
            teamLetter="A"
            data={teamA}
            onChange={p => setTeamA(prev => ({ ...prev, ...p }))}
          />
          <MeatTagPanel
            teamLetter="B"
            data={teamB}
            onChange={p => setTeamB(prev => ({ ...prev, ...p }))}
          />
        </div>

        {/* Crime tape: Match */}
        <CrimeTape label="PARAMÈTRES" />

        {/* Match settings — dark card */}
        <div className="butcher-card p-3 space-y-3">
          {/* Competition selector */}
          <div>
            <p className="section-label mb-1.5 block">Compétition</p>

            {/* League grid */}
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {LEAGUES.map(l => (
                <button
                  key={l.id}
                  onClick={() => { setCompetition(l.name); setUseCustom(false); }}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-left transition-all ${
                    competition === l.name && !useCustom
                      ? 'bg-red-900/60 border border-red-700/60 text-white'
                      : 'bg-zinc-900/60 border border-zinc-800/60 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <span className="text-base flex-shrink-0">{l.flag}</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold truncate leading-tight">{l.name}</p>
                    <p className="text-[8px] text-zinc-500 leading-tight">{l.country}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom input */}
            <div className="flex gap-1.5 items-center">
              <input
                type="text"
                value={customCompetition}
                onChange={e => { setCustomCompetition(e.target.value); setUseCustom(true); setCompetition(e.target.value); }}
                onFocus={() => setUseCustom(true)}
                placeholder="Autre compétition..."
                className={`butcher-input flex-1 h-7 px-2 text-[11px] rounded transition-all ${
                  useCustom ? 'border-red-700/60' : ''
                }`}
              />
            </div>
          </div>
        </div>

        {/* Crime tape: Tips */}
        <CrimeTape label="GUIDE" />

        {/* Tips */}
        <div className="butcher-card p-3 space-y-2">
          <div className="flex gap-2 items-start">
            <span>🔪</span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground/70">Minutes de but</strong> : Tapez les minutes séparées par des virgules dans chaque équipe.
              <code className="text-red-400 bg-red-950/30 px-1 rounded ml-1">23, 67, 88</code>
            </p>
          </div>
          <div className="flex gap-2 items-start">
            <span>⚡</span>
            <p className="text-[11px] text-muted-foreground">À l'approche de la minute, le logo est guidé vers le filet automatiquement.</p>
          </div>
          <div className="flex gap-2 items-start">
            <span>🎬</span>
            <p className="text-[11px] text-muted-foreground">4 sec d'intro → simulation 90 min en 50 sec → écran de résultat final.</p>
          </div>
        </div>

        {/* Bottom stamp */}
        <div className="flex justify-center pt-2">
          <div className="prediction-stamp">
            Prediction Butcher™
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
