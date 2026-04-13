export interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

export interface LogoBody {
  x: number;
  y: number;
  radius: number;
  color: string;
  image: HTMLImageElement | null;
  trail: TrailPoint[];
  teamName: string;
}

export interface GoalNet {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScoreState {
  scoreA: number;
  scoreB: number;
  matchMinute: number;
  competition: string;
  teamAName: string;
  teamBName: string;
  teamAColor: string;
  teamBColor: string;
  teamAImage: HTMLImageElement | null;
  teamBImage: HTMLImageElement | null;
  isFinished: boolean;
}

export function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h));
  grad.addColorStop(0, '#1a0a2e');
  grad.addColorStop(0.5, '#0d0521');
  grad.addColorStop(1, '#050210');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

export function drawArena(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 30;
  ctx.stroke();
  ctx.shadowBlur = 60;
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
  ctx.stroke();
  ctx.restore();
}

export function drawGoalNet(ctx: CanvasRenderingContext2D, goal: GoalNet) {
  ctx.save();
  ctx.shadowColor = '#00ffaa';
  ctx.shadowBlur = 20;
  ctx.strokeStyle = '#00ffaa';
  ctx.lineWidth = 2;

  // Draw goal frame
  ctx.strokeRect(goal.x, goal.y, goal.width, goal.height);

  // Draw net grid
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = 'rgba(0, 255, 170, 0.4)';
  const gridSize = 12;
  for (let x = goal.x; x <= goal.x + goal.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, goal.y);
    ctx.lineTo(x, goal.y + goal.height);
    ctx.stroke();
  }
  for (let y = goal.y; y <= goal.y + goal.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(goal.x, y);
    ctx.lineTo(goal.x + goal.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawTrail(ctx: CanvasRenderingContext2D, trail: TrailPoint[], color: string) {
  if (trail.length < 2) return;
  ctx.save();
  for (let i = 1; i < trail.length; i++) {
    const alpha = 1 - trail[i].age / 30;
    if (alpha <= 0) continue;
    const width = (1 - trail[i].age / 30) * 8;
    ctx.beginPath();
    ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
    ctx.lineTo(trail[i].x, trail[i].y);
    ctx.strokeStyle = color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
    ctx.lineWidth = width;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.stroke();
  }
  ctx.restore();
}

export function drawLogo(ctx: CanvasRenderingContext2D, body: LogoBody) {
  ctx.save();

  // Neon glow circle
  ctx.beginPath();
  ctx.arc(body.x, body.y, body.radius + 4, 0, Math.PI * 2);
  ctx.shadowColor = body.color;
  ctx.shadowBlur = 25;
  ctx.strokeStyle = body.color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Clip to circle for image
  ctx.beginPath();
  ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
  ctx.clip();

  if (body.image) {
    ctx.drawImage(
      body.image,
      body.x - body.radius,
      body.y - body.radius,
      body.radius * 2,
      body.radius * 2
    );
  } else {
    // Fallback: colored circle with initials
    ctx.fillStyle = body.color;
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${body.radius * 0.8}px Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(body.teamName.substring(0, 2).toUpperCase(), body.x, body.y);
  }

  ctx.restore();
}

export function drawScoreOverlay(ctx: CanvasRenderingContext2D, w: number, state: ScoreState) {
  ctx.save();

  // Background bar
  const barH = 80;
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, 'rgba(10, 5, 30, 0.9)');
  grad.addColorStop(0.5, 'rgba(20, 10, 50, 0.95)');
  grad.addColorStop(1, 'rgba(10, 5, 30, 0.9)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, barH);

  // Bottom neon line
  ctx.beginPath();
  ctx.moveTo(0, barH);
  ctx.lineTo(w, barH);
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 10;
  ctx.stroke();

  // Team logos in overlay
  const logoSize = 28;
  const centerX = w / 2;

  // Team A logo
  drawMiniLogo(ctx, centerX - 90, 40, logoSize, state.teamAImage, state.teamAColor, state.teamAName);
  // Team B logo
  drawMiniLogo(ctx, centerX + 90, 40, logoSize, state.teamBImage, state.teamBColor, state.teamBName);

  // Score
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 15;
  ctx.fillText(`${state.scoreA} - ${state.scoreB}`, centerX, 38);

  // Timer
  ctx.font = '14px monospace';
  ctx.fillStyle = '#00ffaa';
  ctx.shadowColor = '#00ffaa';
  ctx.shadowBlur = 8;
  ctx.fillText(`${Math.floor(state.matchMinute)}'`, centerX, 65);

  // Competition
  ctx.font = '10px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.shadowBlur = 0;
  ctx.fillText(state.competition.toUpperCase(), centerX, 12);

  ctx.restore();
}

function drawMiniLogo(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  img: HTMLImageElement | null, color: string, name: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  if (img) {
    ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${r}px Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.substring(0, 2).toUpperCase(), x, y);
  }
  ctx.restore();
}

export function drawEndOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, state: ScoreState) {
  ctx.save();

  // Darken
  ctx.fillStyle = 'rgba(5, 2, 16, 0.75)';
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;

  // MATCH TERMINÉ
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 42px Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 30;
  ctx.fillText('MATCH TERMINÉ', cx, cy - 60);

  // Final score
  ctx.font = 'bold 72px Impact, sans-serif';
  ctx.shadowColor = '#00ffaa';
  ctx.shadowBlur = 40;
  ctx.fillText(`${state.scoreA} : ${state.scoreB}`, cx, cy + 10);

  // Team names
  ctx.font = 'bold 22px Impact, sans-serif';
  ctx.shadowBlur = 10;
  ctx.fillStyle = state.teamAColor;
  ctx.shadowColor = state.teamAColor;
  ctx.fillText(state.teamAName.toUpperCase(), cx - 80, cy + 60);
  ctx.fillStyle = '#fff';
  ctx.shadowBlur = 0;
  ctx.fillText('vs', cx, cy + 60);
  ctx.fillStyle = state.teamBColor;
  ctx.shadowColor = state.teamBColor;
  ctx.shadowBlur = 10;
  ctx.fillText(state.teamBName.toUpperCase(), cx + 80, cy + 60);

  // Competition
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#00ffaa';
  ctx.shadowColor = '#00ffaa';
  ctx.shadowBlur = 15;
  ctx.fillText(state.competition.toUpperCase(), cx, cy + 100);

  ctx.restore();
}

export function drawGoalFlash(ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, color: string) {
  if (progress <= 0) return;
  ctx.save();
  ctx.fillStyle = color.replace(')', `, ${progress * 0.3})`).replace('rgb', 'rgba');
  ctx.fillRect(0, 0, w, h);

  ctx.font = `bold ${80 + (1 - progress) * 40}px Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(255, 255, 255, ${progress})`;
  ctx.shadowColor = color;
  ctx.shadowBlur = 50;
  ctx.fillText('GOOOAL!', w / 2, h / 2);
  ctx.restore();
}
