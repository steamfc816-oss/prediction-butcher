import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { usePhysicsEngine, type PhysicsConfig } from '@/hooks/usePhysicsEngine';
import {
  drawBackground, drawArena, drawGoalNet, drawTrail, drawLogo,
  drawScoreOverlay, drawEndOverlay, drawGoalFlash,
  type TrailPoint, type LogoBody, type ScoreState,
} from '@/lib/canvasRenderer';

export interface TeamData {
  name: string;
  color: string;
  image: HTMLImageElement | null;
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
const GOAL: PhysicsConfig['goalNet'] = { x: 30, y: ARENA_CY + ARENA_R - 70, width: 60, height: 50 };

const SimulationCanvas = forwardRef<SimulationCanvasHandle, Props>(({
  teamA, teamB, competition, running, onScoreChange, onGoal, onBounce
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const trailA = useRef<TrailPoint[]>([]);
  const trailB = useRef<TrailPoint[]>([]);
  const scoreRef = useRef({ a: 0, b: 0 });
  const minuteRef = useRef(0);
  const goalFlashRef = useRef({ progress: 0, color: '' });
  const finishedRef = useRef(false);
  const startTimeRef = useRef(0);
  const goalCooldownRef = useRef(0);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

  const config: PhysicsConfig = {
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
    arenaRadius: ARENA_R,
    arenaCenterX: ARENA_CX,
    arenaCenterY: ARENA_CY,
    goalNet: GOAL,
    logoRadius: LOGO_R,
  };

  const handleCollision = useCallback((type: string) => {
    if (type === 'wall' || type === 'logos') {
      onBounce?.();
    }
    if (goalCooldownRef.current > 0) return;
    if (type === 'goalA') {
      scoreRef.current.a += 1;
      goalFlashRef.current = { progress: 1, color: teamA.color };
      onGoal?.('A');
      onScoreChange?.(scoreRef.current.a, scoreRef.current.b);
      goalCooldownRef.current = 120; // 2 seconds cooldown
    }
    if (type === 'goalB') {
      scoreRef.current.b += 1;
      goalFlashRef.current = { progress: 1, color: teamB.color };
      onGoal?.('B');
      onScoreChange?.(scoreRef.current.a, scoreRef.current.b);
      goalCooldownRef.current = 120;
    }
  }, [teamA.color, teamB.color, onGoal, onBounce, onScoreChange]);

  const physics = usePhysicsEngine(config, handleCollision);

  // Reset on start
  useEffect(() => {
    if (running) {
      scoreRef.current = { a: 0, b: 0 };
      minuteRef.current = 0;
      finishedRef.current = false;
      trailA.current = [];
      trailB.current = [];
      startTimeRef.current = performance.now();
      goalCooldownRef.current = 0;
      physics.init();
    } else {
      physics.destroy();
    }
  }, [running]);

  // Animation loop
  useEffect(() => {
    if (!running) return;

    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      physics.step();
      const state = physics.getState();

      // Update match minute (90 min in ~60 seconds of real time)
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      minuteRef.current = Math.min(90, elapsed * 1.5);

      if (goalCooldownRef.current > 0) goalCooldownRef.current--;

      // Check match end
      if (minuteRef.current >= 90 && !finishedRef.current) {
        finishedRef.current = true;
      }

      // Update trails
      trailA.current.unshift({ x: state.logoA.x, y: state.logoA.y, age: 0 });
      trailB.current.unshift({ x: state.logoB.x, y: state.logoB.y, age: 0 });
      trailA.current = trailA.current
        .map(p => ({ ...p, age: p.age + 1 }))
        .filter(p => p.age < 30);
      trailB.current = trailB.current
        .map(p => ({ ...p, age: p.age + 1 }))
        .filter(p => p.age < 30);

      // Draw
      drawBackground(ctx, CANVAS_W, CANVAS_H);
      drawArena(ctx, ARENA_CX, ARENA_CY, ARENA_R);
      drawGoalNet(ctx, GOAL);

      drawTrail(ctx, trailA.current, teamA.color);
      drawTrail(ctx, trailB.current, teamB.color);

      const logoABody: LogoBody = {
        x: state.logoA.x, y: state.logoA.y, radius: LOGO_R,
        color: teamA.color, image: teamA.image, trail: trailA.current, teamName: teamA.name,
      };
      const logoBBody: LogoBody = {
        x: state.logoB.x, y: state.logoB.y, radius: LOGO_R,
        color: teamB.color, image: teamB.image, trail: trailB.current, teamName: teamB.name,
      };

      drawLogo(ctx, logoABody);
      drawLogo(ctx, logoBBody);

      const scoreState: ScoreState = {
        scoreA: scoreRef.current.a,
        scoreB: scoreRef.current.b,
        matchMinute: minuteRef.current,
        competition,
        teamAName: teamA.name,
        teamBName: teamB.name,
        teamAColor: teamA.color,
        teamBColor: teamB.color,
        teamAImage: teamA.image,
        teamBImage: teamB.image,
        isFinished: finishedRef.current,
      };

      drawScoreOverlay(ctx, CANVAS_W, scoreState);

      // Goal flash
      if (goalFlashRef.current.progress > 0) {
        drawGoalFlash(ctx, CANVAS_W, CANVAS_H, goalFlashRef.current.progress, goalFlashRef.current.color);
        goalFlashRef.current.progress -= 0.02;
      }

      if (finishedRef.current) {
        drawEndOverlay(ctx, CANVAS_W, CANVAS_H, scoreState);
      }

      if (running && !finishedRef.current) {
        animRef.current = requestAnimationFrame(loop);
      }
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [running, teamA, teamB, competition]);

  // Draw idle state
  useEffect(() => {
    if (running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawBackground(ctx, CANVAS_W, CANVAS_H);
    drawArena(ctx, ARENA_CX, ARENA_CY, ARENA_R);
    drawGoalNet(ctx, GOAL);

    const scoreState: ScoreState = {
      scoreA: 0, scoreB: 0, matchMinute: 0, competition,
      teamAName: teamA.name, teamBName: teamB.name,
      teamAColor: teamA.color, teamBColor: teamB.color,
      teamAImage: teamA.image, teamBImage: teamB.image,
      isFinished: false,
    };
    drawScoreOverlay(ctx, CANVAS_W, scoreState);

    // Draw static logos at center
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
