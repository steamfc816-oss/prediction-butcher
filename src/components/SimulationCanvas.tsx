import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { usePhysicsEngine, type PhysicsConfig } from '@/hooks/usePhysicsEngine';
import {
  drawBackground, drawArena, drawGoalNet, drawTrail, drawLogo,
  drawScoreOverlay, drawEndOverlay, drawGoalCelebration, drawIntroScreen,
  spawnGoalParticles, updateGoalParticles,
  type TrailPoint, type LogoBody, type ScoreState, type GoalParticle
} from '@/lib/canvasRenderer';

export interface TeamData {
  name: string;
  color: string;
  image: HTMLImageElement | null;
  scriptedGoals?: string;
}

export interface SimulationCanvasHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

interface Props {
  teamA: TeamData;
  teamB: TeamData;
  competition: string;
  running: boolean;
  onScoreChange?: (scoreA: number, scoreB: number) => void;
  onGoal?: (team: 'A' | 'B') => void;
  onBounce?: () => void;
}

const CANVAS_W = 360;
const CANVAS_H = 640;
const ARENA_R = 145;
const ARENA_CX = CANVAS_W / 2;
const ARENA_CY = CANVAS_H / 2 + 20;
const LOGO_R = 28;

const GOAL_TOP    = { x: ARENA_CX - 40, y: ARENA_CY - ARENA_R - 35, width: 80, height: 40 };
const GOAL_BOTTOM = { x: ARENA_CX - 40, y: ARENA_CY + ARENA_R - 5,  width: 80, height: 40 };

const INTRO_DURATION = 4.0; // seconds

type Phase = 'idle' | 'intro' | 'sim' | 'finished';

const SimulationCanvas = forwardRef<SimulationCanvasHandle, Props>((
  { teamA, teamB, competition, running, onScoreChange, onGoal, onBounce },
  ref
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);

  // Intro state
  const phaseRef      = useRef<Phase>('idle');
  const introStartRef = useRef<number>(0);

  // Simulation state
  const trailA    = useRef<TrailPoint[]>([]);
  const trailB    = useRef<TrailPoint[]>([]);
  const scoreRef  = useRef({ a: 0, b: 0 });
  const minuteRef = useRef(0);

  const triggeredGoalsA = useRef<Set<number>>(new Set());
  const triggeredGoalsB = useRef<Set<number>>(new Set());
  const launchedGoalA   = useRef<Set<number>>(new Set());
  const launchedGoalB   = useRef<Set<number>>(new Set());

  const goalFlashRef   = useRef({ progress: 0, color: '', isTeamA: true });
  const particlesRef   = useRef<GoalParticle[]>([]);
  const finishedRef    = useRef(false);
  const startTimeRef   = useRef(0);
  const goalCooldownRef = useRef(0);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

  const config: PhysicsConfig = {
    canvasWidth: CANVAS_W, canvasHeight: CANVAS_H,
    arenaRadius: ARENA_R, arenaCenterX: ARENA_CX, arenaCenterY: ARENA_CY,
    goalNetA: GOAL_TOP, goalNetB: GOAL_BOTTOM, logoRadius: LOGO_R,
  };

  const collisionHandler = useCallback((type: string) => {
    if (type === 'wall' || type === 'logos') { onBounce?.(); }
    if (goalCooldownRef.current > 0) return;

    const hasScriptedGoals = (teamA.scriptedGoals && teamA.scriptedGoals.trim() !== '') ||
      (teamB.scriptedGoals && teamB.scriptedGoals.trim() !== '');

    function scoreGoal(team: 'A' | 'B') {
      const color = team === 'A' ? teamA.color : teamB.color;
      if (team === 'A') {
        if (hasScriptedGoals) {
          const goalsA = (teamA.scriptedGoals || '').split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
          const pending = goalsA.filter(m => !triggeredGoalsA.current.has(m)).sort((a, b) => a - b);
          if (pending.length > 0) triggeredGoalsA.current.add(pending[0]);
        }
        scoreRef.current.a += 1;
      } else {
        if (hasScriptedGoals) {
          const goalsB = (teamB.scriptedGoals || '').split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
          const pending = goalsB.filter(m => !triggeredGoalsB.current.has(m)).sort((a, b) => a - b);
          if (pending.length > 0) triggeredGoalsB.current.add(pending[0]);
        }
        scoreRef.current.b += 1;
      }

      goalFlashRef.current = { progress: 1, color, isTeamA: team === 'A' };
      particlesRef.current = spawnGoalParticles(CANVAS_W / 2, CANVAS_H / 2, color, '#FFFFFF');
      onGoal?.(team);
      onScoreChange?.(scoreRef.current.a, scoreRef.current.b);
      goalCooldownRef.current = 140;
      physics.prepareGoal(null);
      physics.setGoalsState(true, true);
      setTimeout(() => physics.resetLogos(), 300);
    }

    if (type === 'goalA') scoreGoal('A');
    if (type === 'goalB') scoreGoal('B');
  }, [teamA, teamB, onGoal, onBounce, onScoreChange]);

  const physics = usePhysicsEngine(config, collisionHandler);

  // ── Bootstrap on running change ────────────────────────────
  useEffect(() => {
    if (running) {
      // Reset all simulation state
      scoreRef.current      = { a: 0, b: 0 };
      minuteRef.current     = 0;
      finishedRef.current   = false;
      trailA.current        = [];
      trailB.current        = [];
      particlesRef.current  = [];
      goalFlashRef.current  = { progress: 0, color: '', isTeamA: true };
      triggeredGoalsA.current.clear();
      triggeredGoalsB.current.clear();
      launchedGoalA.current.clear();
      launchedGoalB.current.clear();
      goalCooldownRef.current = 0;

      // Start intro, physics will init after intro finishes
      phaseRef.current      = 'intro';
      introStartRef.current = performance.now();
    } else {
      phaseRef.current = 'idle';
      physics.destroy();
    }
  }, [running]);

  // ── Main animation loop ────────────────────────────────────
  useEffect(() => {
    if (!running) return;

    const makeScoreState = (): ScoreState => ({
      scoreA: scoreRef.current.a,
      scoreB: scoreRef.current.b,
      matchMinute: minuteRef.current,
      competition,
      teamAName: teamA.name, teamBName: teamB.name,
      teamAColor: teamA.color, teamBColor: teamB.color,
      teamAImage: teamA.image, teamBImage: teamB.image,
      isFinished: finishedRef.current,
    });

    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // ── INTRO PHASE ──────────────────────────────────────────
      if (phaseRef.current === 'intro') {
        const elapsed = (performance.now() - introStartRef.current) / 1000;
        const t = Math.min(1, elapsed / INTRO_DURATION);

        drawIntroScreen(ctx, CANVAS_W, CANVAS_H, makeScoreState(), t);

        if (t >= 1) {
          // Transition to simulation
          phaseRef.current   = 'sim';
          startTimeRef.current = performance.now();
          physics.init();
        }

        if (running) animRef.current = requestAnimationFrame(loop);
        return;
      }

      // ── SIMULATION PHASE ─────────────────────────────────────
      if (phaseRef.current !== 'sim') return;

      physics.step();
      const state = physics.getState();

      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      minuteRef.current = Math.min(90, elapsed * 2.8);

      // Goal cooldown management
      if (goalCooldownRef.current > 0) {
        goalCooldownRef.current--;
        physics.setGoalsState(true, true);
        physics.prepareGoal(null);
      } else {
        const hasScriptedGoals = (teamA.scriptedGoals && teamA.scriptedGoals.trim() !== '') ||
          (teamB.scriptedGoals && teamB.scriptedGoals.trim() !== '');

        if (hasScriptedGoals) {
          const goalsA = (teamA.scriptedGoals || '').split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
          const goalsB = (teamB.scriptedGoals || '').split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));

          let preparingA = false;
          let preparingB = false;
          const PREP_WINDOW = 5.0; // match-minutes ≈ 1.8 real-seconds of guidance

          goalsA.forEach(m => {
            if (!triggeredGoalsA.current.has(m) && minuteRef.current >= m - PREP_WINDOW) {
              preparingA = true;
              if (!launchedGoalA.current.has(m)) {
                launchedGoalA.current.add(m);
                physics.launchForGoal('A');
              }
            }
          });
          goalsB.forEach(m => {
            if (!triggeredGoalsB.current.has(m) && minuteRef.current >= m - PREP_WINDOW) {
              preparingB = true;
              if (!launchedGoalB.current.has(m)) {
                launchedGoalB.current.add(m);
                physics.launchForGoal('B');
              }
            }
          });

          physics.setGoalsState(!preparingA, !preparingB);
          physics.prepareGoal(preparingA ? 'A' : preparingB ? 'B' : null);
        } else {
          // No scripted goals: keep goals open, let physics handle random bounces
          physics.setGoalsState(false, false);
          physics.prepareGoal(null);
        }
      }

      // Check match finish
      if (minuteRef.current >= 90 && !finishedRef.current && goalCooldownRef.current <= 0) {
        finishedRef.current = true;
        phaseRef.current = 'finished';
      }

      // Update trails
      trailA.current.unshift({ x: state.logoA.x, y: state.logoA.y, age: 0 });
      trailB.current.unshift({ x: state.logoB.x, y: state.logoB.y, age: 0 });
      trailA.current = trailA.current.map(p => ({ ...p, age: p.age + 1 })).filter(p => p.age < 30);
      trailB.current = trailB.current.map(p => ({ ...p, age: p.age + 1 })).filter(p => p.age < 30);

      // Draw
      drawBackground(ctx, CANVAS_W, CANVAS_H);
      drawArena(ctx, ARENA_CX, ARENA_CY, ARENA_R);
      drawGoalNet(ctx, GOAL_TOP);
      drawGoalNet(ctx, GOAL_BOTTOM);
      drawTrail(ctx, trailA.current, teamA.color);
      drawTrail(ctx, trailB.current, teamB.color);

      const logoABody: LogoBody = { x: state.logoA.x, y: state.logoA.y, radius: LOGO_R, color: teamA.color, image: teamA.image, trail: trailA.current, teamName: teamA.name };
      const logoBBody: LogoBody = { x: state.logoB.x, y: state.logoB.y, radius: LOGO_R, color: teamB.color, image: teamB.image, trail: trailB.current, teamName: teamB.name };

      drawLogo(ctx, logoABody);
      drawLogo(ctx, logoBBody);
      drawScoreOverlay(ctx, CANVAS_W, makeScoreState());

      // Goal celebration
      if (goalFlashRef.current.progress > 0) {
        particlesRef.current = updateGoalParticles(particlesRef.current);
        drawGoalCelebration(ctx, CANVAS_W, CANVAS_H, goalFlashRef.current.progress, goalFlashRef.current.color, particlesRef.current);
        goalFlashRef.current.progress -= 0.008;
      }

      // End overlay
      if (phaseRef.current === 'finished') {
        drawEndOverlay(ctx, CANVAS_W, CANVAS_H, makeScoreState());
      }

      if (running && phaseRef.current !== 'finished') {
        animRef.current = requestAnimationFrame(loop);
      }
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [running, teamA, teamB, competition]);

  // ── Static preview (not running) ──────────────────────────
  useEffect(() => {
    if (running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawBackground(ctx, CANVAS_W, CANVAS_H);
    drawArena(ctx, ARENA_CX, ARENA_CY, ARENA_R);
    drawGoalNet(ctx, GOAL_TOP);
    drawGoalNet(ctx, GOAL_BOTTOM);

    const scoreState: ScoreState = {
      scoreA: 0, scoreB: 0, matchMinute: 0, competition,
      teamAName: teamA.name, teamBName: teamB.name,
      teamAColor: teamA.color, teamBColor: teamB.color,
      teamAImage: teamA.image, teamBImage: teamB.image,
      isFinished: false,
    };
    drawScoreOverlay(ctx, CANVAS_W, scoreState);

    drawLogo(ctx, { x: ARENA_CX - 50, y: ARENA_CY, radius: LOGO_R, color: teamA.color, image: teamA.image, trail: [], teamName: teamA.name });
    drawLogo(ctx, { x: ARENA_CX + 50, y: ARENA_CY, radius: LOGO_R, color: teamB.color, image: teamB.image, trail: [], teamName: teamB.name });
  }, [running, teamA, teamB, competition]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="rounded-lg border border-border w-full max-w-[360px] mx-auto"
      style={{ aspectRatio: '9/16' }}
    />
  );
});

SimulationCanvas.displayName = 'SimulationCanvas';
export default SimulationCanvas;
