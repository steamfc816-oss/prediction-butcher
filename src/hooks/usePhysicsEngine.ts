import { useRef, useCallback, useEffect } from 'react';
import Matter from 'matter-js';

export interface PhysicsConfig {
  canvasWidth: number;
  canvasHeight: number;
  arenaRadius: number;
  arenaCenterX: number;
  arenaCenterY: number;
  goalNet: { x: number; y: number; width: number; height: number };
  logoRadius: number;
}

export interface PhysicsState {
  logoA: { x: number; y: number; vx: number; vy: number };
  logoB: { x: number; y: number; vx: number; vy: number };
}

export type CollisionCallback = (type: 'wall' | 'logos' | 'goalA' | 'goalB') => void;

export function usePhysicsEngine(config: PhysicsConfig, onCollision: CollisionCallback) {
  const engineRef = useRef<Matter.Engine | null>(null);
  const logoARef = useRef<Matter.Body | null>(null);
  const logoBRef = useRef<Matter.Body | null>(null);
  const wallBodiesRef = useRef<Matter.Body[]>([]);
  const goalSensorRef = useRef<Matter.Body | null>(null);
  const runningRef = useRef(false);

  const init = useCallback(() => {
    const engine = Matter.Engine.create({ gravity: { x: 0, y: 0.15 } });
    engineRef.current = engine;

    // Create circular arena walls using segments
    const segments = 48;
    const walls: Matter.Body[] = [];
    for (let i = 0; i < segments; i++) {
      const angle1 = (i / segments) * Math.PI * 2;
      const angle2 = ((i + 1) / segments) * Math.PI * 2;
      const mx = config.arenaCenterX + Math.cos((angle1 + angle2) / 2) * (config.arenaRadius + 10);
      const my = config.arenaCenterY + Math.sin((angle1 + angle2) / 2) * (config.arenaRadius + 10);
      const segLen = 2 * config.arenaRadius * Math.sin(Math.PI / segments) + 20;
      const wall = Matter.Bodies.rectangle(mx, my, segLen, 20, {
        isStatic: true,
        angle: (angle1 + angle2) / 2 + Math.PI / 2,
        restitution: 1,
        friction: 0,
        label: 'wall',
        render: { visible: false },
      });
      walls.push(wall);
    }
    wallBodiesRef.current = walls;

    // Goal sensor
    const goalSensor = Matter.Bodies.rectangle(
      config.goalNet.x + config.goalNet.width / 2,
      config.goalNet.y + config.goalNet.height / 2,
      config.goalNet.width * 0.6,
      config.goalNet.height * 0.6,
      { isStatic: true, isSensor: true, label: 'goal' }
    );
    goalSensorRef.current = goalSensor;

    // Goal walls (3 sides, open top)
    const gt = 8;
    const goalWalls = [
      Matter.Bodies.rectangle(config.goalNet.x, config.goalNet.y + config.goalNet.height / 2, gt, config.goalNet.height, { isStatic: true, restitution: 0.8, label: 'goalWall' }),
      Matter.Bodies.rectangle(config.goalNet.x + config.goalNet.width, config.goalNet.y + config.goalNet.height / 2, gt, config.goalNet.height, { isStatic: true, restitution: 0.8, label: 'goalWall' }),
      Matter.Bodies.rectangle(config.goalNet.x + config.goalNet.width / 2, config.goalNet.y + config.goalNet.height, config.goalNet.width, gt, { isStatic: true, restitution: 0.8, label: 'goalWall' }),
    ];

    // Logos
    const logoA = Matter.Bodies.circle(
      config.arenaCenterX - 60, config.arenaCenterY - 40,
      config.logoRadius,
      { restitution: 0.95, friction: 0.01, frictionAir: 0.002, label: 'logoA' }
    );
    const logoB = Matter.Bodies.circle(
      config.arenaCenterX + 60, config.arenaCenterY + 40,
      config.logoRadius,
      { restitution: 0.95, friction: 0.01, frictionAir: 0.002, label: 'logoB' }
    );

    // Random initial velocities
    Matter.Body.setVelocity(logoA, { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8 });
    Matter.Body.setVelocity(logoB, { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8 });

    logoARef.current = logoA;
    logoBRef.current = logoB;

    Matter.Composite.add(engine.world, [...walls, ...goalWalls, goalSensor, logoA, logoB]);

    // Collision events
    Matter.Events.on(engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        if (labels.includes('goal')) {
          if (labels.includes('logoA')) onCollision('goalA');
          if (labels.includes('logoB')) onCollision('goalB');
        } else if (labels.includes('logoA') && labels.includes('logoB')) {
          onCollision('logos');
        } else if (labels.includes('wall') && (labels.includes('logoA') || labels.includes('logoB'))) {
          onCollision('wall');
        }
      }
    });

    return engine;
  }, [config, onCollision]);

  const step = useCallback((dt: number = 1000 / 60) => {
    if (engineRef.current) {
      Matter.Engine.update(engineRef.current, dt);

      // Keep logos inside arena
      [logoARef.current, logoBRef.current].forEach(logo => {
        if (!logo) return;
        const dx = logo.position.x - config.arenaCenterX;
        const dy = logo.position.y - config.arenaCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = config.arenaRadius - config.logoRadius - 5;
        if (dist > maxDist) {
          const nx = dx / dist;
          const ny = dy / dist;
          Matter.Body.setPosition(logo, {
            x: config.arenaCenterX + nx * maxDist,
            y: config.arenaCenterY + ny * maxDist,
          });
          // Reflect velocity
          const v = logo.velocity;
          const dot = v.x * nx + v.y * ny;
          Matter.Body.setVelocity(logo, {
            x: v.x - 2 * dot * nx,
            y: v.y - 2 * dot * ny,
          });
        }
        // Minimum speed to keep things exciting
        const speed = Math.sqrt(logo.velocity.x ** 2 + logo.velocity.y ** 2);
        if (speed < 2) {
          const scale = 3 / Math.max(speed, 0.1);
          Matter.Body.setVelocity(logo, {
            x: logo.velocity.x * scale,
            y: logo.velocity.y * scale,
          });
        }
      });
    }
  }, [config]);

  const getState = useCallback((): PhysicsState => {
    const a = logoARef.current;
    const b = logoBRef.current;
    return {
      logoA: { x: a?.position.x ?? 0, y: a?.position.y ?? 0, vx: a?.velocity.x ?? 0, vy: a?.velocity.y ?? 0 },
      logoB: { x: b?.position.x ?? 0, y: b?.position.y ?? 0, vx: b?.velocity.x ?? 0, vy: b?.velocity.y ?? 0 },
    };
  }, []);

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

  return { init, step, getState, destroy, runningRef };
}
