export interface TrailPoint { x: number; y: number; age: number; }
export interface LogoBody { x: number; y: number; radius: number; color: string; image: HTMLImageElement | null; trail: TrailPoint[]; teamName: string; }
export interface GoalNet { x: number; y: number; width: number; height: number; }
export interface ScoreState {
  scoreA: number; scoreB: number; matchMinute: number; competition: string;
  teamAName: string; teamBName: string; teamAColor: string; teamBColor: string;
  teamAImage: HTMLImageElement | null; teamBImage: HTMLImageElement | null; isFinished: boolean;
}

export interface GoalParticle {
  x: number; y: number; vx: number; vy: number;
  radius: number; color: string; life: number; decay: number;
  rotation: number; rotSpeed: number;
  type: 'spark' | 'slash' | 'blood';
}

/* ── Helpers ───────────────────────────────────────────── */
function hexToRgba(hex: string, alpha: number): string {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return `rgba(128,128,128,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getInitials(name: string): string {
  if (!name) return '';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

/* ── Logo ───────────────────────────────────────────────── */
const butcherLogoRef: { img: HTMLImageElement | null } = { img: null };
if (typeof window !== 'undefined') {
  const img = new Image();
  img.src = '/logo.png';
  img.onload = () => { butcherLogoRef.img = img; };
}

/* ── Particles ─────────────────────────────────────────── */
export function spawnGoalParticles(cx: number, cy: number, color1: string, _color2: string): GoalParticle[] {
  const particles: GoalParticle[] = [];
  const palette = ['#dc2626', '#b91c1c', '#991b1b', '#ffffff', '#fca5a5', color1];

  for (let i = 0; i < 200; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 20;
    const tr = Math.random();
    const type: GoalParticle['type'] = tr < 0.3 ? 'blood' : tr < 0.65 ? 'slash' : 'spark';
    particles.push({
      x: cx + (Math.random() - 0.5) * 40,
      y: cy + (Math.random() - 0.5) * 40,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: type === 'slash' ? 4 + Math.random() * 10 : 2 + Math.random() * 7,
      color: palette[Math.floor(Math.random() * palette.length)],
      life: 1,
      decay: type === 'blood' ? 0.008 + Math.random() * 0.01 : 0.012 + Math.random() * 0.018,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.25,
      type,
    });
  }
  return particles;
}

export function updateGoalParticles(particles: GoalParticle[]): GoalParticle[] {
  return particles
    .map(p => ({
      ...p,
      x: p.x + p.vx, y: p.y + p.vy,
      vy: p.vy + 0.25, // gravity pull
      vx: p.vx * 0.94,
      rotation: p.rotation + p.rotSpeed,
      life: p.life - p.decay
    }))
    .filter(p => p.life > 0);
}

/* ── Background ─────────────────────────────────────────── */
export function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Very dark background
  ctx.fillStyle = '#080404';
  ctx.fillRect(0, 0, w, h);

  // Subtle grid
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 0.5;
  const grid = 28;
  for (let x = 0; x < w; x += grid) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += grid) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.restore();

  // Heavy vignette
  const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.15, w / 2, h / 2, Math.max(w, h) * 0.9);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

/* ── Arena as Butcher Chopping Block ─────────────────────── */
export function drawArena(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  ctx.save();

  // ── 1. Clip everything to circle ──────────────────────────
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.save();
  ctx.clip();

  // ── 2. Base wood color (end-grain cross-section) ──────────
  const baseGrad = ctx.createRadialGradient(cx - radius * 0.15, cy - radius * 0.1, 0, cx, cy, radius);
  baseGrad.addColorStop(0, '#5c3a1e');  // Light heartwood center
  baseGrad.addColorStop(0.35, '#4a2e15');
  baseGrad.addColorStop(0.7, '#3b2310');
  baseGrad.addColorStop(1, '#2a1a0a');  // Dark outer ring
  ctx.fillStyle = baseGrad;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  // ── 3. Tree rings (concentric circles) ────────────────────
  const ringCount = 14;
  for (let i = 1; i <= ringCount; i++) {
    const r = (i / ringCount) * (radius - 2);
    const brightness = i % 2 === 0 ? 0.12 : 0.06;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(20,10,4,${brightness})`;
    ctx.lineWidth = i % 3 === 0 ? 2.2 : 1.2;
    ctx.stroke();
  }

  // ── 4. Subtle radial wood grain lines ─────────────────────
  const grainCount = 28;
  for (let i = 0; i < grainCount; i++) {
    const angle = (i / grainCount) * Math.PI * 2;
    const jitter = (Math.random() - 0.5) * 0.08;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(angle + jitter) * radius,
      cy + Math.sin(angle + jitter) * radius
    );
    ctx.strokeStyle = 'rgba(15,7,2,0.10)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  // ── 5. Knife slash marks ───────────────────────────────────
  const slashes = [
    { x1: cx - 60, y1: cy - 30, x2: cx + 45, y2: cy - 45, w: 1.5 },
    { x1: cx - 40, y1: cy + 20, x2: cx + 55, y2: cy + 35, w: 1.2 },
    { x1: cx - 20, y1: cy - 70, x2: cx + 30, y2: cy - 55, w: 1.0 },
    { x1: cx + 15, y1: cy - 10, x2: cx + 70, y2: cy + 10, w: 0.8 },
    { x1: cx - 75, y1: cy + 10, x2: cx - 15, y2: cy + 30, w: 1.3 },
  ];
  slashes.forEach(({ x1, y1, x2, y2, w }) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(10,4,2,0.45)';
    ctx.lineWidth = w * 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = w * 0.5;
    ctx.stroke();
  });

  // ── 6. Blood stain splatters ───────────────────────────────
  const bloodSpots = [
    { x: cx - 45, y: cy + 40, r: 18, a: 0.25 },
    { x: cx + 55, y: cy - 25, r: 10, a: 0.18 },
    { x: cx - 15, y: cy + 65, r: 7, a: 0.20 },
    { x: cx + 25, y: cy + 50, r: 5, a: 0.15 },
    { x: cx - 60, y: cy - 45, r: 14, a: 0.20 },
  ];
  bloodSpots.forEach(({ x, y, r, a }) => {
    const bg = ctx.createRadialGradient(x, y, 0, x, y, r);
    bg.addColorStop(0, `rgba(120,5,5,${a})`);
    bg.addColorStop(1, 'rgba(80,0,0,0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });

  // ── 7. Center heartwood highlight ──────────────────────────
  const cwGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.45);
  cwGrad.addColorStop(0, 'rgba(255,200,120,0.05)');
  cwGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cwGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.45, 0, Math.PI * 2);
  ctx.fill();

  // ── 8. Butcher logo watermark on wood ─────────────────────
  if (butcherLogoRef.img) {
    ctx.globalAlpha = 0.15;
    const lr = 95;
    ctx.drawImage(butcherLogoRef.img, cx - lr, cy - lr, lr * 2, lr * 2);
    ctx.globalAlpha = 1.0;
  }

  ctx.restore(); // end clip

  // ── 9. Outer rim (dark bark edge) ─────────────────────────
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#1a0c04';
  ctx.lineWidth = 8;
  ctx.shadowBlur = 0;
  ctx.stroke();

  // ── 10. Brand red glowing ring ────────────────────────────
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 1, 0, Math.PI * 2);
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#dc2626';
  ctx.shadowBlur = 16;
  ctx.stroke();

  // ── 11. Halftime dashed line on wood ──────────────────────
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.setLineDash([5, 9]);
  ctx.beginPath();
  ctx.moveTo(cx - radius * 0.95, cy);
  ctx.lineTo(cx + radius * 0.95, cy);
  ctx.strokeStyle = 'rgba(220,38,38,0.25)';
  ctx.lineWidth = 1;
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // ── 12. Center spot ───────────────────────────────────────
  ctx.beginPath();
  ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = '#dc2626';
  ctx.shadowColor = '#dc2626';
  ctx.shadowBlur = 12;
  ctx.fill();

  ctx.restore();
}

/* ── Goal net ───────────────────────────────────────────── */
export function drawGoalNet(ctx: CanvasRenderingContext2D, goal: GoalNet) {
  ctx.save();

  // Net fill
  ctx.fillStyle = 'rgba(220,38,38,0.06)';
  ctx.fillRect(goal.x, goal.y, goal.width, goal.height);

  // Glowing border
  ctx.shadowColor = '#dc2626';
  ctx.shadowBlur = 20;
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(goal.x, goal.y, goal.width, goal.height);

  // Inner net mesh
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = 'rgba(220,38,38,0.35)';
  ctx.shadowBlur = 0;
  const gridSize = 12;
  for (let x = goal.x + gridSize; x < goal.x + goal.width; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, goal.y); ctx.lineTo(x, goal.y + goal.height); ctx.stroke();
  }
  for (let y = goal.y + gridSize; y < goal.y + goal.height; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(goal.x, y); ctx.lineTo(goal.x + goal.width, y); ctx.stroke();
  }

  ctx.restore();
}

/* ── Trail ──────────────────────────────────────────────── */
export function drawTrail(ctx: CanvasRenderingContext2D, trail: TrailPoint[], color: string) {
  if (trail.length < 2) return;
  ctx.save();
  for (let i = 1; i < trail.length; i++) {
    const t = 1 - trail[i].age / 30;
    if (t <= 0) continue;
    ctx.beginPath();
    ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
    ctx.lineTo(trail[i].x, trail[i].y);
    ctx.strokeStyle = hexToRgba(color, t * 0.85);
    ctx.lineWidth = t * 9;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8 * t;
    ctx.stroke();
  }
  ctx.restore();
}

/* ── Logo ball ──────────────────────────────────────────── */
export function drawLogo(ctx: CanvasRenderingContext2D, body: LogoBody) {
  ctx.save();

  // Outer glow ring
  ctx.beginPath();
  ctx.arc(body.x, body.y, body.radius + 5, 0, Math.PI * 2);
  ctx.shadowColor = body.color;
  ctx.shadowBlur = 30;
  ctx.strokeStyle = hexToRgba(body.color, 0.7);
  ctx.lineWidth = 2;
  ctx.stroke();

  // Clip and draw image/fallback
  ctx.beginPath();
  ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
  ctx.clip();

  if (body.image) {
    ctx.drawImage(body.image, body.x - body.radius, body.y - body.radius, body.radius * 2, body.radius * 2);
  } else {
    // Gradient fill
    const g = ctx.createRadialGradient(body.x - body.radius * 0.3, body.y - body.radius * 0.3, 2, body.x, body.y, body.radius);
    g.addColorStop(0, '#fff');
    g.addColorStop(1, body.color);
    ctx.fillStyle = g;
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(body.radius * 0.72)}px Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText(getInitials(body.teamName), body.x, body.y);
  }

  ctx.restore();
}

/* ── Score overlay (HUD top bar) ────────────────────────── */
export function drawScoreOverlay(ctx: CanvasRenderingContext2D, w: number, state: ScoreState) {
  ctx.save();
  const barH = 88;

  // Dark bar background
  ctx.fillStyle = 'rgba(8,4,4,0.92)';
  ctx.fillRect(0, 0, w, barH);

  // Bottom separator line
  ctx.beginPath();
  ctx.moveTo(0, barH);
  ctx.lineTo(w, barH);
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#dc2626';
  ctx.shadowBlur = 12;
  ctx.stroke();

  // Brand watermark top-left
  ctx.font = 'bold 9px Arial, sans-serif';
  ctx.fillStyle = 'rgba(220,38,38,0.5)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.shadowBlur = 0;
  //ctx.fillText('THE PREDICTION BUTCHER 🔪', 10, 6);

  // Competition center
  ctx.font = '10px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.textAlign = 'center';
  ctx.fillText(state.competition.toUpperCase(), w / 2, 6);

  // Minute top-right removed, it will be placed between the score
  
  const cx = w / 2;

  // Team A (logo only, no name)
  drawMiniLogo(ctx, cx - 110, 52, 24, state.teamAImage, state.teamAColor, state.teamAName);

  // Team B (logo only, no name)
  drawMiniLogo(ctx, cx + 110, 52, 24, state.teamBImage, state.teamBColor, state.teamBName);

  // Score badge center with Time between them
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#dc2626';
  
  // Score A
  ctx.textAlign = 'right';
  ctx.font = 'bold 40px Impact, sans-serif';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(state.scoreA.toString(), cx - 35, 50);

  // Match minute (in white)
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.shadowBlur = 5;
  ctx.fillStyle = '#ffffff';
  const timeText = state.isFinished ? 'FT' : `${Math.floor(state.matchMinute)}'`;
  ctx.fillText(timeText, cx, 50);

  // Score B
  ctx.textAlign = 'left';
  ctx.font = 'bold 40px Impact, sans-serif';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(state.scoreB.toString(), cx + 35, 50);

  // Time bar under score
  const totalDuration = 90;
  const progress = Math.min(1, state.matchMinute / totalDuration);
  const barW = 90;
  const barY = 76;
  const barX = cx - barW / 2;

  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(barX, barY, barW, 5);
  ctx.fillStyle = '#dc2626';
  ctx.shadowBlur = 6;
  ctx.fillRect(barX, barY, barW * progress, 5);

  ctx.restore();
}

function drawMiniLogo(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, img: HTMLImageElement | null, color: string, name: string) {
  ctx.save();

  // Ring
  ctx.beginPath();
  ctx.arc(x, y, r + 2, 0, Math.PI * 2);
  ctx.strokeStyle = hexToRgba(color, 0.8);
  ctx.lineWidth = 1.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.stroke();

  // Clip + fill
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  if (img) {
    ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(r * 0.7)}px Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText(getInitials(name), x, y);
  }
  ctx.restore();
}

/* ── End overlay ────────────────────────────────────────── */
export function drawEndOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, state: ScoreState) {
  ctx.save();

  // ── Full-canvas dark film ──────────────────────────────
  ctx.fillStyle = 'rgba(4,2,2,0.93)';
  ctx.fillRect(0, 0, w, h);

  // Subtle warm radial glow (stadium atmosphere)
  const glow = ctx.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, w * 0.85);
  glow.addColorStop(0,   'rgba(220,38,38,0.16)');
  glow.addColorStop(0.5, 'rgba(100,10,10,0.05)');
  glow.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;

  // ── BRAND line (top third) ─────────────────────────────
  const brandY = h * 0.18;
  ctx.font = 'bold 9px Arial, sans-serif';
  ctx.fillStyle = 'rgba(220,38,38,0.65)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '0.24em';
  ctx.shadowBlur = 0;
  ctx.fillText('THE PREDICTION BUTCHER', cx, brandY);
  ctx.letterSpacing = '0';

  // Thin red line below brand
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(cx - 55, brandY + 11, 110, 1.5);

  // ── COMPETITION name ───────────────────────────────────
  const compY = h * 0.245;
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.shadowBlur = 0;
  ctx.fillText(state.competition.toUpperCase(), cx, compY, w - 30);

  // ── "RÉSULTAT FINAL" label ─────────────────────────────
  const labelY = h * 0.31;
  ctx.font = 'bold 10px Arial, sans-serif';
  ctx.fillStyle = '#dc2626';
  ctx.letterSpacing = '0.18em';
  ctx.fillText('RÉSULTAT FINAL', cx, labelY);
  ctx.letterSpacing = '0';

  // ── Red accent lines around score block ───────────────
  const lineTop = h * 0.345;
  const lineBot = h * 0.58;
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, lineTop, w, 1.5);
  ctx.fillRect(0, lineBot, w, 1.5);

  // ── SCORE (big, centered) ──────────────────────────────
  const scoreY = (lineTop + lineBot) / 2;
  ctx.font = 'bold 90px Impact, sans-serif';
  ctx.shadowColor = '#dc2626';
  ctx.shadowBlur = 50;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${state.scoreA}  :  ${state.scoreB}`, cx, scoreY);
  ctx.shadowBlur = 0;

  // ── Sub-score label ────────────────────────────────────
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillText('TEMPS PLEIN', cx, lineBot - 18);

  // ── Team logos (below score block) ────────────────────
  const logoY  = h * 0.68;
  const logoR  = 38;

  drawLargeTeamCircle(ctx, cx - 80, logoY, logoR, state.teamAImage, state.teamAColor, state.teamAName, 1);
  drawLargeTeamCircle(ctx, cx + 80, logoY, logoR, state.teamBImage, state.teamBColor, state.teamBName, 1);

  // Team names below logos
  const nameY = logoY + logoR + 16;
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.shadowBlur = 0;

  ctx.fillStyle = state.teamAColor;
  ctx.fillText(state.teamAName.toUpperCase(), cx - 80, nameY, 110);

  ctx.fillStyle = state.teamBColor;
  ctx.fillText(state.teamBName.toUpperCase(), cx + 80, nameY, 110);

  // VS divider between logos
  ctx.font = 'bold 14px Impact, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillText('VS', cx, logoY);

  // ── Winner highlight ───────────────────────────────────
  if (state.scoreA !== state.scoreB) {
    const winnerX = state.scoreA > state.scoreB ? cx - 80 : cx + 80;
    const winnerColor = state.scoreA > state.scoreB ? state.teamAColor : state.teamBColor;
    ctx.beginPath();
    ctx.arc(winnerX, logoY, logoR + 10, 0, Math.PI * 2);
    ctx.strokeStyle = winnerColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = winnerColor;
    ctx.shadowBlur = 20;
    ctx.stroke();

    // Trophy emoji above winner
    ctx.font = '18px serif';
    ctx.shadowBlur = 0;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('🏆', winnerX, logoY - logoR - 16);
  } else {
    // Draw
    ctx.font = 'bold 10px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.letterSpacing = '0.15em';
    ctx.fillText('MATCH NUL', cx, logoY - logoR - 14);
    ctx.letterSpacing = '0';
  }

  // ── Bottom hashtag / CTA ───────────────────────────────
  const ctaY = h * 0.91;
  ctx.font = 'bold 10px Arial, sans-serif';
  ctx.fillStyle = 'rgba(220,38,38,0.5)';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '0.1em';
  ctx.fillText('#PredictionButcher 🔪', cx, ctaY);
  ctx.letterSpacing = '0';

  ctx.restore();
}

/* ── Goal Celebration ───────────────────────────────────── */
export function drawGoalCelebration(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  progress: number, color: string, particles: GoalParticle[]
) {
  if (progress <= 0) return;
  ctx.save();

  const zoomPhase = progress > 0.82 ? (1 - progress) / 0.18 : 1;
  const fadePhase = progress < 0.22 ? progress / 0.22 : 1;
  const alpha = zoomPhase * fadePhase;

  // 1. Red flash vignette
  const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h));
  bgGrad.addColorStop(0, hexToRgba('#dc2626', alpha * 0.45));
  bgGrad.addColorStop(0.5, hexToRgba('#dc2626', alpha * 0.12));
  bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Particles
  ctx.save();
  for (const p of particles) {
    const pa = Math.max(0, p.life) * fadePhase;
    if (pa < 0.02) continue;
    ctx.globalAlpha = pa;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;

    if (p.type === 'slash') {
      // Diagonal fast spark line
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.beginPath();
      ctx.moveTo(-p.radius * 2.5, 0);
      ctx.lineTo(p.radius * 2.5, 0);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    } else if (p.type === 'blood') {
      // Teardrop / organic blob
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Spark dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // 3. "GOAL!" Impact text
  const pulse = 1 + Math.sin((1 - progress) * Math.PI * 28) * 0.04;
  ctx.save();
  ctx.translate(w / 2, h / 2 - 18);
  const scale = zoomPhase * pulse;
  ctx.scale(scale, scale);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Shadow / bleed layers
  ctx.globalAlpha = alpha * 0.35;
  ctx.font = 'bold 96px Impact, sans-serif';
  ctx.fillStyle = '#dc2626';
  ctx.shadowColor = '#dc2626';
  ctx.shadowBlur = 80;
  ctx.fillText('GOAL!', 0, 0);

  // Chromatic separation
  ctx.globalAlpha = alpha * 0.45;
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,0,40,0.5)';
  ctx.fillText('GOAL!', -7, 4);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText('GOAL!', 7, -4);

  // Main white text
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#dc2626';
  ctx.shadowBlur = 40;
  ctx.fillText('GOAL!', 0, 0);

  // Outline
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 3 / Math.max(scale, 0.1);
  ctx.shadowBlur = 20;
  ctx.strokeText('GOAL!', 0, 0);

  // Sub-text
  ctx.font = `bold 20px Arial, sans-serif`;
  ctx.globalAlpha = alpha * fadePhase * 0.9;
  ctx.fillStyle = '#fca5a5';
  ctx.shadowColor = '#dc2626';
  ctx.shadowBlur = 10;
  ctx.fillText('⚽  THE PREDICTION BUTCHER  🔪', 0, 62);

  ctx.restore();
  ctx.restore();
}

/* ── Large team circle (shared helper) ─────────────────── */
function drawLargeTeamCircle(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  img: HTMLImageElement | null,
  color: string, name: string, alpha: number
) {
  ctx.save();
  ctx.globalAlpha = alpha;

  // Outer glow ring
  ctx.beginPath();
  ctx.arc(x, y, r + 6, 0, Math.PI * 2);
  ctx.strokeStyle = hexToRgba(color, 0.55);
  ctx.lineWidth = 2.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 28;
  ctx.stroke();

  // Inner white ring
  ctx.beginPath();
  ctx.arc(x, y, r + 3, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.shadowBlur = 0;
  ctx.stroke();

  // Clip and fill
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  if (img) {
    ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
  } else {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r);
    g.addColorStop(0, '#333');
    g.addColorStop(1, color);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(r * 0.65)}px Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText(getInitials(name), x, y);
  }

  ctx.restore();
  ctx.restore();
}

/* ── Intro screen ───────────────────────────────────────── */
export function drawIntroScreen(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  state: ScoreState,
  t: number          // 0 → 1 animation progress
) {
  ctx.save();

  // Background
  ctx.fillStyle = '#060202';
  ctx.fillRect(0, 0, w, h);

  // Red radial glow
  const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.85);
  glow.addColorStop(0, 'rgba(220,38,38,0.2)');
  glow.addColorStop(0.4, 'rgba(100,10,10,0.06)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;

  // Slide-in progress (first 30% of t)
  const slideIn = Math.min(1, t / 0.3);
  // smooth ease-out
  const ease = 1 - Math.pow(1 - slideIn, 3);

  // Team A slides from left, team B from right
  const ax = (cx - 95) - (1 - ease) * 160;
  const bx = (cx + 95) + (1 - ease) * 160;

  const holdAlpha = Math.min(1, slideIn * 2);

  // ── Brand label ─────────────────────────────────────────
  ctx.globalAlpha = holdAlpha * 0.7;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 9px Arial, sans-serif';
  ctx.fillStyle = 'rgba(220,38,38,0.75)';
  ctx.letterSpacing = '0.26em';
  ctx.fillText('THE PREDICTION BUTCHER', cx, cy - 195);
  ctx.letterSpacing = '0';

  // ── Competition name ─────────────────────────────────────
  ctx.globalAlpha = holdAlpha;
  ctx.font = 'bold 17px Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#dc2626';
  ctx.shadowBlur = 20;
  ctx.fillText(state.competition.toUpperCase(), cx, cy - 168);
  ctx.shadowBlur = 0;

  // Red underline
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(cx - 65, cy - 154, 130, 2);

  // ── VS (center) ─────────────────────────────────────────
  ctx.globalAlpha = holdAlpha * 0.15;
  ctx.font = 'bold 36px Impact, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('VS', cx, cy - 10);
  ctx.globalAlpha = 1;

  // ── Team logos ──────────────────────────────────────────
  drawLargeTeamCircle(ctx, ax, cy - 10, 60, state.teamAImage, state.teamAColor, state.teamAName, holdAlpha);
  drawLargeTeamCircle(ctx, bx, cy - 10, 60, state.teamBImage, state.teamBColor, state.teamBName, holdAlpha);

  // ── Team names below logos ───────────────────────────────
  ctx.globalAlpha = holdAlpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowBlur = 0;

  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillStyle = state.teamAColor;
  ctx.fillText(state.teamAName.toUpperCase(), ax, cy + 70, 115);

  ctx.fillStyle = state.teamBColor;
  ctx.fillText(state.teamBName.toUpperCase(), bx, cy + 70, 115);

  // ── Countdown (after t=0.40) ─────────────────────────────
  if (t > 0.40) {
    const ct = (t - 0.40) / 0.60;  // 0..1
    const step = Math.floor(ct * 4);  // 0,1,2,3
    const labels = ['3', '2', '1', '⚽'];
    const label = labels[Math.min(step, 3)];

    // Local ping pulse per beat
    const beatFrac = (ct * 4) % 1;
    const pulse = 1 + Math.sin(beatFrac * Math.PI) * 0.14;

    ctx.save();
    ctx.translate(cx, cy + 145);
    ctx.scale(pulse, pulse);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = holdAlpha;
    ctx.font = 'bold 70px Impact, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#dc2626';
    ctx.shadowBlur = 45;
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }

  // ── Fade to black at end ─────────────────────────────────
  if (t > 0.86) {
    const fadeOut = (t - 0.86) / 0.14;
    ctx.globalAlpha = fadeOut;
    ctx.fillStyle = '#060202';
    ctx.fillRect(0, 0, w, h);
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}
