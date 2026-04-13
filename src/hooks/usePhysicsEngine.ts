import { useRef, useCallback, useEffect } from 'react';
import Matter from 'matter-js';

export interface PhysicsConfig {
  canvasWidth: number;
  canvasHeight: number;
  arenaRadius: number;
  arenaCenterX: number;
  arenaCenterY: number;
  goalNetA: { x: number; y: number; width: number; height: number };
  goalNetB: { x: number; y: number; width: number; height: number };
  logoRadius: number;
}

export interface PhysicsState {
  logoA: { x: number; y: number; vx: number; vy: number };
  logoB: { x: number; y: number; vx: number; vy: number };
}

export type CollisionCallback = (type: 'wall' | 'logos' | 'goalA' | 'goalB') => void;

const TARGET_SPEED     = 5.0;
const MIN_SPEED        = 3.5;
const MAX_SPEED_NORMAL = 7.5;
const MAX_SPEED_GUIDED = 16;    // fast enough to reach goal from anywhere in arena
const STEERING_BASE    = 0.55;  // base steering blend per frame (raised from 0.28)
const STEERING_CLOSE   = 0.90;  // aggressive near-goal steering

export function usePhysicsEngine(config: PhysicsConfig, onCollision: CollisionCallback) {
  const engineRef      = useRef<Matter.Engine | null>(null);
  const logoARef       = useRef<Matter.Body | null>(null);
  const logoBRef       = useRef<Matter.Body | null>(null);
  const goalBlockerARef = useRef<Matter.Body | null>(null);
  const goalBlockerBRef = useRef<Matter.Body | null>(null);
  const preparingGoalRef = useRef<'A' | 'B' | null>(null);
  const frameCountRef  = useRef(0);
  const runningRef     = useRef(false);

  const init = useCallback(() => {
    const engine = Matter.Engine.create({ gravity: { x: 0, y: 0 } });
    engineRef.current = engine;
    frameCountRef.current = 0;

    const segments = 60;
    const walls: Matter.Body[] = [];
    const gapAngle = Math.asin((config.goalNetA.width / 2) / config.arenaRadius) * 2;

    for (let i = 0; i < segments; i++) {
      const t = (i / segments) * Math.PI * 2 - Math.PI;
      const isGap =
        Math.abs(t - (-Math.PI / 2)) < gapAngle / 2 + 0.05 ||
        Math.abs(t - (Math.PI / 2))  < gapAngle / 2 + 0.05;
      if (isGap) continue;

      const angle1 = (i / segments) * Math.PI * 2;
      const angle2 = ((i + 1) / segments) * Math.PI * 2;
      const mx = config.arenaCenterX + Math.cos((angle1 + angle2) / 2) * (config.arenaRadius + 8);
      const my = config.arenaCenterY + Math.sin((angle1 + angle2) / 2) * (config.arenaRadius + 8);
      const segLen = 2 * config.arenaRadius * Math.sin(Math.PI / segments) + 16;
      walls.push(Matter.Bodies.rectangle(mx, my, segLen, 18, {
        isStatic: true, angle: (angle1 + angle2) / 2 + Math.PI / 2,
        restitution: 1.0, friction: 0, label: 'wall',
      }));
    }

    const gt = 10;

    const goalSensorA = Matter.Bodies.rectangle(
      config.goalNetA.x + config.goalNetA.width / 2,
      config.goalNetA.y + config.goalNetA.height / 2,
      config.goalNetA.width, config.goalNetA.height,
      { isStatic: true, isSensor: true, label: 'goalA' }
    );
    const goalWallsA = [
      Matter.Bodies.rectangle(config.goalNetA.x - gt / 2, config.goalNetA.y + config.goalNetA.height / 2, gt, config.goalNetA.height + gt, { isStatic: true, restitution: 0.7, label: 'goalWall' }),
      Matter.Bodies.rectangle(config.goalNetA.x + config.goalNetA.width + gt / 2, config.goalNetA.y + config.goalNetA.height / 2, gt, config.goalNetA.height + gt, { isStatic: true, restitution: 0.7, label: 'goalWall' }),
      Matter.Bodies.rectangle(config.goalNetA.x + config.goalNetA.width / 2, config.goalNetA.y - gt / 2, config.goalNetA.width + gt * 2, gt, { isStatic: true, restitution: 0.7, label: 'goalWall' }),
    ];

    const goalSensorB = Matter.Bodies.rectangle(
      config.goalNetB.x + config.goalNetB.width / 2,
      config.goalNetB.y + config.goalNetB.height / 2,
      config.goalNetB.width, config.goalNetB.height,
      { isStatic: true, isSensor: true, label: 'goalB' }
    );
    const goalWallsB = [
      Matter.Bodies.rectangle(config.goalNetB.x - gt / 2, config.goalNetB.y + config.goalNetB.height / 2, gt, config.goalNetB.height + gt, { isStatic: true, restitution: 0.7, label: 'goalWall' }),
      Matter.Bodies.rectangle(config.goalNetB.x + config.goalNetB.width + gt / 2, config.goalNetB.y + config.goalNetB.height / 2, gt, config.goalNetB.height + gt, { isStatic: true, restitution: 0.7, label: 'goalWall' }),
      Matter.Bodies.rectangle(config.goalNetB.x + config.goalNetB.width / 2, config.goalNetB.y + config.goalNetB.height + gt / 2, config.goalNetB.width + gt * 2, gt, { isStatic: true, restitution: 0.7, label: 'goalWall' }),
    ];

    const goalBlockerA = Matter.Bodies.rectangle(
      config.goalNetA.x + config.goalNetA.width / 2,
      config.goalNetA.y + config.goalNetA.height + 5,
      config.goalNetA.width + 4, 12,
      { isStatic: true, isSensor: true, restitution: 0.8, label: 'wall' }
    );
    const goalBlockerB = Matter.Bodies.rectangle(
      config.goalNetB.x + config.goalNetB.width / 2,
      config.goalNetB.y - 5,
      config.goalNetB.width + 4, 12,
      { isStatic: true, isSensor: true, restitution: 0.8, label: 'wall' }
    );
    goalBlockerARef.current = goalBlockerA;
    goalBlockerBRef.current = goalBlockerB;

    const logoA = Matter.Bodies.circle(
      config.arenaCenterX + (Math.random() - 0.5) * 40,
      config.arenaCenterY + 30 + (Math.random() - 0.5) * 20,
      config.logoRadius,
      { restitution: 0.92, friction: 0.008, frictionAir: 0.004, density: 0.045, label: 'logoA' }
    );
    const logoB = Matter.Bodies.circle(
      config.arenaCenterX + (Math.random() - 0.5) * 40,
      config.arenaCenterY - 30 + (Math.random() - 0.5) * 20,
      config.logoRadius,
      { restitution: 0.92, friction: 0.008, frictionAir: 0.004, density: 0.045, label: 'logoB' }
    );

    // Kick-off: launch sideways to prevent immediate goals
    const angleA = (Math.random() - 0.5) * 0.8;
    const angleB = Math.PI + (Math.random() - 0.5) * 0.8;
    Matter.Body.setVelocity(logoA, { x: Math.cos(angleA) * TARGET_SPEED, y: Math.sin(angleA) * TARGET_SPEED });
    Matter.Body.setVelocity(logoB, { x: Math.cos(angleB) * TARGET_SPEED, y: Math.sin(angleB) * TARGET_SPEED });

    logoARef.current = logoA;
    logoBRef.current = logoB;

    Matter.Composite.add(engine.world, [
      ...walls, ...goalWallsA, ...goalWallsB,
      goalSensorA, goalSensorB, goalBlockerA, goalBlockerB,
      logoA, logoB
    ]);

    Matter.Events.on(engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        if (labels.includes('goalA')) onCollision('goalA');
        else if (labels.includes('goalB')) onCollision('goalB');
        else if (labels.includes('logoA') && labels.includes('logoB')) onCollision('logos');
        else if (labels.includes('wall') || labels.includes('goalWall')) onCollision('wall');
      }
    });

    runningRef.current = true;
    return engine;
  }, [config, onCollision]);

  const resetLogos = useCallback(() => {
    if (logoARef.current && logoBRef.current) {
      Matter.Body.setPosition(logoARef.current, { x: config.arenaCenterX + (Math.random() - 0.5) * 30, y: config.arenaCenterY + 30 });
      Matter.Body.setPosition(logoBRef.current, { x: config.arenaCenterX + (Math.random() - 0.5) * 30, y: config.arenaCenterY - 30 });
      const dirA = Math.random() > 0.5 ? 1 : -1;
      const dirB = Math.random() > 0.5 ? 1 : -1;
      Matter.Body.setVelocity(logoARef.current, { x: dirA * (TARGET_SPEED + Math.random() * 1.5), y: (Math.random() - 0.5) * 2.5 });
      Matter.Body.setVelocity(logoBRef.current, { x: dirB * (TARGET_SPEED + Math.random() * 1.5), y: (Math.random() - 0.5) * 2.5 });
    }
  }, [config]);

  /**
   * Called once when a goal minute enters the prep window.
   * Teleports the ball to a "launch zone" inside the arena half
   * closest to the target goal, then fires it toward the net.
   */
  const launchForGoal = useCallback((team: 'A' | 'B') => {
    const logo = team === 'A' ? logoARef.current : logoBRef.current;
    const net  = team === 'A' ? config.goalNetA : config.goalNetB;
    if (!logo) return;

    // Place ball in the correct half of the arena, offset from exact center
    const cx = config.arenaCenterX;
    const cy = config.arenaCenterY;
    const halfR = config.arenaRadius * 0.45;
    const launchX = cx + (Math.random() - 0.5) * 50;
    const launchY = team === 'A'
      ? cy - halfR + (Math.random() - 0.5) * 20   // upper half → goal A (top)
      : cy + halfR + (Math.random() - 0.5) * 20;  // lower half → goal B (bottom)

    Matter.Body.setPosition(logo, { x: launchX, y: launchY });

    // Aim directly at the goal center with a strong initial velocity
    const gx = net.x + net.width / 2;
    const gy = net.y + net.height / 2;
    const dx = gx - launchX;
    const dy = gy - launchY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = TARGET_SPEED * 2.2;

    Matter.Body.setVelocity(logo, {
      x: (dx / dist) * speed,
      y: (dy / dist) * speed,
    });
  }, [config]);

  const rescueIfStuck = useCallback((body: Matter.Body) => {
    const nets = [config.goalNetA, config.goalNetB];
    const margin = 8;
    for (const net of nets) {
      if (
        body.position.x > net.x - margin && body.position.x < net.x + net.width  + margin &&
        body.position.y > net.y - margin && body.position.y < net.y + net.height + margin
      ) {
        Matter.Body.setPosition(body, { x: config.arenaCenterX, y: config.arenaCenterY });
        const angle = Math.random() * Math.PI * 2;
        Matter.Body.setVelocity(body, { x: Math.cos(angle) * TARGET_SPEED, y: Math.sin(angle) * TARGET_SPEED });
        return true;
      }
    }
    return false;
  }, [config]);

  const step = useCallback((dt: number = 1000 / 60) => {
    if (!engineRef.current) return;
    Matter.Engine.update(engineRef.current, dt);
    frameCountRef.current++;

    const fc = frameCountRef.current;
    const logos = [
      { body: logoARef.current, team: 'A' as const },
      { body: logoBRef.current, team: 'B' as const },
    ];

    logos.forEach(({ body, team }) => {
      if (!body) return;
      const isGuided = preparingGoalRef.current === team;

      if (isGuided) {
        // ── GUIDED MODE: steer progressively toward goal ──────────
        const net = team === 'A' ? config.goalNetA : config.goalNetB;
        const gx = net.x + net.width / 2;
        const gy = net.y + net.height / 2;
        const dx = gx - body.position.x;
        const dy = gy - body.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Stronger steering the closer the ball is to the goal
        const closeness = Math.max(0, 1 - dist / 200);
        const strength = STEERING_BASE + (STEERING_CLOSE - STEERING_BASE) * closeness;

        const desired = { x: (dx / dist) * MAX_SPEED_GUIDED, y: (dy / dist) * MAX_SPEED_GUIDED };
        const newVx = body.velocity.x + (desired.x - body.velocity.x) * strength;
        const newVy = body.velocity.y + (desired.y - body.velocity.y) * strength;
        Matter.Body.setVelocity(body, { x: newVx, y: newVy });

      } else {
        // ── FREE MODE: organic movement ────────────────────────────
        if (rescueIfStuck(body)) return;

        const wobble = Math.sin(fc * 0.04 + (team === 'A' ? 0 : Math.PI)) * 0.04;
        const nx = body.velocity.x + body.velocity.y * wobble;
        const ny = body.velocity.y - body.velocity.x * wobble;
        const s2 = Math.sqrt(nx * nx + ny * ny);

        if (s2 < MIN_SPEED) {
          const sc = TARGET_SPEED / Math.max(s2, 0.01);
          Matter.Body.setVelocity(body, { x: nx * sc, y: ny * sc });
        } else if (s2 > MAX_SPEED_NORMAL) {
          const sc = MAX_SPEED_NORMAL / s2;
          Matter.Body.setVelocity(body, { x: nx * sc, y: ny * sc });
        } else {
          Matter.Body.setVelocity(body, { x: nx, y: ny });
        }
      }
    });
  }, [config, rescueIfStuck]);

  const setGoalsState = useCallback((blockedA: boolean, blockedB: boolean) => {
    if (goalBlockerARef.current) goalBlockerARef.current.isSensor = !blockedA;
    if (goalBlockerBRef.current) goalBlockerBRef.current.isSensor = !blockedB;
  }, []);

  const prepareGoal = useCallback((team: 'A' | 'B' | null) => {
    preparingGoalRef.current = team;
  }, []);

  const getState = useCallback((): PhysicsState => {
    const a = logoARef.current;
    const b = logoBRef.current;
    return {
      logoA: { x: a?.position.x ?? 0, y: a?.position.y ?? 0, vx: a?.velocity.x ?? 0, vy: a?.velocity.y ?? 0 },
      logoB: { x: b?.position.x ?? 0, y: b?.position.y ?? 0, vx: b?.velocity.x ?? 0, vy: b?.velocity.y ?? 0 },
    };
  }, []);

  const forceGoal = useCallback((team: 'A' | 'B') => {
    const logo = team === 'A' ? logoARef.current : logoBRef.current;
    const net  = team === 'A' ? config.goalNetA   : config.goalNetB;
    if (logo) {
      Matter.Body.setPosition(logo, { x: net.x + net.width / 2, y: net.y + net.height / 2 });
      Matter.Body.setVelocity(logo, { x: 0, y: 0 });
    }
  }, [config]);

  const destroy = useCallback(() => {
    if (engineRef.current) {
      Matter.Engine.clear(engineRef.current);
      engineRef.current = null;
    }
    runningRef.current = false;
  }, []);

  useEffect(() => {
    return () => destroy();
  }, [destroy]);

  return { init, step, getState, destroy, resetLogos, setGoalsState, prepareGoal, launchForGoal, forceGoal, runningRef };
}
