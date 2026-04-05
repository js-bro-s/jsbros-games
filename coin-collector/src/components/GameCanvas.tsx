import { useEffect, useRef } from "react";
import type { Enemy, GameState, Platform } from "../types/game";
import { COIN_TIERS, GAME_CONFIG } from "../types/game";

interface GameCanvasProps {
  state: GameState;
}

// --- Pixel art colors ---
const SKY_TOP = "#5c94fc";
const SKY_BOTTOM = "#a0d0ff";
const GRASS_TOP = "#4caf50";
const GRASS_BODY = "#8d6e3f";
const GRASS_DARK = "#6d4e2f";
const GRASS_LINE = "#2e7d32";
const CLOUD_COLOR = "rgba(255,255,255,0.85)";
const CLOUD_SHADOW = "rgba(200,220,255,0.5)";

// --- Draw helpers ---

function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, SKY_TOP);
  grad.addColorStop(1, SKY_BOTTOM);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawParallaxClouds(ctx: CanvasRenderingContext2D, cameraX: number, w: number) {
  // Deterministic clouds based on seed positions
  const clouds = [
    { x: 100, y: 40, s: 1.2 },
    { x: 400, y: 70, s: 0.8 },
    { x: 700, y: 30, s: 1.0 },
    { x: 1100, y: 60, s: 1.4 },
    { x: 1500, y: 45, s: 0.9 },
    { x: 1900, y: 75, s: 1.1 },
    { x: 2400, y: 35, s: 1.3 },
    { x: 2900, y: 55, s: 0.7 },
    { x: 3400, y: 65, s: 1.0 },
    { x: 3800, y: 40, s: 0.8 },
  ];

  const parallax = 0.3;
  for (const c of clouds) {
    const sx = c.x - cameraX * parallax;
    // Wrap around
    const wrappedX = ((sx % (w + 200)) + w + 200) % (w + 200) - 100;
    drawCloud(ctx, wrappedX, c.y, c.s);
  }
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.fillStyle = CLOUD_SHADOW;
  drawCloudShape(ctx, x + 2, y + 2, scale);
  ctx.fillStyle = CLOUD_COLOR;
  drawCloudShape(ctx, x, y, scale);
}

function drawCloudShape(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  // Blocky pixel cloud using rectangles
  const px = 8 * s;
  ctx.fillRect(x, y, px * 4, px * 2);
  ctx.fillRect(x + px, y - px, px * 2, px);
  ctx.fillRect(x - px, y + px * 0.5, px, px);
  ctx.fillRect(x + px * 4, y + px * 0.5, px, px);
}

function drawPlatform(ctx: CanvasRenderingContext2D, plat: Platform, ox: number) {
  const { TILE_SIZE, GROUND_Y } = GAME_CONFIG;
  const px = plat.x - ox;
  const py = plat.y;
  const cols = Math.ceil(plat.width / TILE_SIZE);
  const rows = Math.ceil(plat.height / TILE_SIZE);
  const isGround = plat.y >= GROUND_Y - 4;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tx = px + col * TILE_SIZE;
      const ty = py + row * TILE_SIZE;

      if (row === 0) {
        // Grass top layer
        ctx.fillStyle = GRASS_TOP;
        ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
        // Grass blades (pixel detail)
        ctx.fillStyle = GRASS_LINE;
        ctx.fillRect(tx, ty, TILE_SIZE, 3);
        // Small highlights
        ctx.fillStyle = "#66bb6a";
        ctx.fillRect(tx + 4, ty + 3, 4, 2);
        ctx.fillRect(tx + 16, ty + 4, 6, 2);
        ctx.fillRect(tx + 26, ty + 3, 3, 2);
      } else {
        // Dirt body
        ctx.fillStyle = GRASS_BODY;
        ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
        // Dirt texture
        ctx.fillStyle = GRASS_DARK;
        ctx.fillRect(tx + 4, ty + 6, 3, 3);
        ctx.fillRect(tx + 18, ty + 12, 4, 3);
        ctx.fillRect(tx + 10, ty + 20, 3, 2);
        // Subtle grid line
        ctx.fillStyle = "rgba(0,0,0,0.08)";
        ctx.fillRect(tx, ty, TILE_SIZE, 1);
        ctx.fillRect(tx, ty, 1, TILE_SIZE);
      }
    }
  }

  // If ground, extend dirt to bottom of canvas
  if (isGround) {
    const bottomY = py + rows * TILE_SIZE;
    const canvasBottom = GAME_CONFIG.CANVAS_HEIGHT;
    if (bottomY < canvasBottom) {
      ctx.fillStyle = GRASS_BODY;
      ctx.fillRect(px, bottomY, plat.width, canvasBottom - bottomY);
    }
  }
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  facing: 1 | -1,
  grounded: boolean,
  walkTimer: number,
  hasSpeed: boolean,
  hasMagnet: boolean,
  time: number,
) {
  const bodyColor = hasMagnet && hasSpeed ? "#88ff88" : hasMagnet ? "#ff88ff" : hasSpeed ? "#00ff88" : "#00d4ff";
  const overallsColor = "#2244cc";
  const skinColor = "#ffcc88";
  const shoeColor = "#884422";
  const hatColor = "#cc2222";

  ctx.save();
  ctx.translate(px + w / 2, py);

  if (facing === -1) {
    ctx.scale(-1, 1);
  }

  const s = w / 28;

  // Walk frame: 4-frame cycle (0,1,2,3) — 0 and 2 are neutral, 1 and 3 are stride
  const walkFrame = grounded ? Math.floor(walkTimer) % 4 : -1;
  // Idle breathing: subtle head bob
  const breathe = (walkTimer === 0 && grounded) ? Math.sin(time * 0.003) * 1.2 : 0;

  // --- Hat ---
  ctx.fillStyle = hatColor;
  ctx.fillRect(-10 * s, breathe + 0, 20 * s, 6 * s);
  ctx.fillRect(-12 * s, breathe + 4 * s, 24 * s, 3 * s);
  // Hat highlight
  ctx.fillStyle = "#ee4444";
  ctx.fillRect(-8 * s, breathe + 1 * s, 6 * s, 2 * s);

  // --- Head / face ---
  ctx.fillStyle = skinColor;
  ctx.fillRect(-8 * s, breathe + 6 * s, 16 * s, 10 * s);

  // Eyes — blink every ~3 seconds
  const blinkCycle = time % 3000;
  const isBlinking = blinkCycle > 2900;
  ctx.fillStyle = "#000000";
  if (isBlinking) {
    // Closed eyes (thin line)
    ctx.fillRect(-5 * s, breathe + 10 * s, 3 * s, 1 * s);
    ctx.fillRect(2 * s, breathe + 10 * s, 3 * s, 1 * s);
  } else {
    // Open eyes
    ctx.fillRect(-5 * s, breathe + 9 * s, 3 * s, 3 * s);
    ctx.fillRect(2 * s, breathe + 9 * s, 3 * s, 3 * s);
    // Pupils (white dot)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-4 * s, breathe + 9 * s, 1 * s, 1 * s);
    ctx.fillRect(3 * s, breathe + 9 * s, 1 * s, 1 * s);
  }

  // Mouth
  ctx.fillStyle = "#000000";
  if (!grounded) {
    // Open mouth (jumping/falling — surprised)
    ctx.fillRect(-2 * s, breathe + 13 * s, 4 * s, 2 * s);
  } else {
    // Smile
    ctx.fillRect(-3 * s, breathe + 14 * s, 6 * s, 1 * s);
  }

  // --- Shirt (visible above overalls) ---
  ctx.fillStyle = bodyColor;
  ctx.fillRect(-6 * s, 14 * s, 12 * s, 4 * s);

  // --- Overall straps ---
  ctx.fillStyle = overallsColor;
  ctx.fillRect(-10 * s, 14 * s, 4 * s, 4 * s);
  ctx.fillRect(6 * s, 14 * s, 4 * s, 4 * s);

  // --- Body / overalls ---
  ctx.fillStyle = overallsColor;
  ctx.fillRect(-10 * s, 16 * s, 20 * s, 10 * s);

  // Overall buttons
  ctx.fillStyle = "#ffd700";
  ctx.fillRect(-2 * s, 18 * s, 2 * s, 2 * s);
  ctx.fillRect(1 * s, 18 * s, 2 * s, 2 * s);

  // --- Arms (animated during walk) ---
  ctx.fillStyle = bodyColor;
  if (!grounded) {
    // Arms up during jump
    ctx.fillRect(-13 * s, 12 * s, 3 * s, 6 * s);
    ctx.fillRect(10 * s, 12 * s, 3 * s, 6 * s);
  } else if (walkFrame === 1 || walkFrame === 2) {
    // Left arm forward, right arm back
    ctx.fillRect(-13 * s, 16 * s, 3 * s, 7 * s);
    ctx.fillRect(10 * s, 18 * s, 3 * s, 5 * s);
  } else if (walkFrame === 3 || walkFrame === 0) {
    // Right arm forward, left arm back (or neutral)
    ctx.fillRect(-13 * s, 18 * s, 3 * s, 5 * s);
    ctx.fillRect(10 * s, 16 * s, 3 * s, 7 * s);
  } else {
    // Idle arms at sides
    ctx.fillRect(-13 * s, 17 * s, 3 * s, 6 * s);
    ctx.fillRect(10 * s, 17 * s, 3 * s, 6 * s);
  }
  // Hands
  ctx.fillStyle = skinColor;
  if (!grounded) {
    ctx.fillRect(-13 * s, 11 * s, 3 * s, 2 * s);
    ctx.fillRect(10 * s, 11 * s, 3 * s, 2 * s);
  } else {
    ctx.fillRect(-13 * s, 22 * s, 3 * s, 2 * s);
    ctx.fillRect(10 * s, 22 * s, 3 * s, 2 * s);
  }

  // --- Legs & Shoes (animated walk cycle) ---
  if (!grounded) {
    // Jump pose: legs tucked
    ctx.fillStyle = overallsColor;
    ctx.fillRect(-8 * s, 26 * s, 6 * s, 3 * s);
    ctx.fillRect(2 * s, 26 * s, 6 * s, 2 * s);
    ctx.fillStyle = shoeColor;
    ctx.fillRect(-9 * s, 28 * s, 7 * s, 3 * s);
    ctx.fillRect(2 * s, 27 * s, 7 * s, 3 * s);
  } else if (walkFrame === 1) {
    // Stride frame 1: left leg forward, right leg back
    ctx.fillStyle = overallsColor;
    ctx.fillRect(-9 * s, 26 * s, 6 * s, 3 * s);
    ctx.fillRect(4 * s, 25 * s, 5 * s, 4 * s);
    ctx.fillStyle = shoeColor;
    ctx.fillRect(-11 * s, 29 * s, 8 * s, 3 * s);
    ctx.fillRect(5 * s, 29 * s, 6 * s, 3 * s);
  } else if (walkFrame === 3) {
    // Stride frame 3: right leg forward, left leg back
    ctx.fillStyle = overallsColor;
    ctx.fillRect(-8 * s, 25 * s, 5 * s, 4 * s);
    ctx.fillRect(3 * s, 26 * s, 6 * s, 3 * s);
    ctx.fillStyle = shoeColor;
    ctx.fillRect(-7 * s, 29 * s, 6 * s, 3 * s);
    ctx.fillRect(3 * s, 29 * s, 8 * s, 3 * s);
  } else {
    // Neutral standing (frames 0, 2 and idle)
    ctx.fillStyle = overallsColor;
    ctx.fillRect(-9 * s, 26 * s, 7 * s, 3 * s);
    ctx.fillRect(2 * s, 26 * s, 7 * s, 3 * s);
    ctx.fillStyle = shoeColor;
    ctx.fillRect(-10 * s, 29 * s, 8 * s, 3 * s);
    ctx.fillRect(2 * s, 29 * s, 8 * s, 3 * s);
  }

  // --- Speed boost aura ---
  if (hasSpeed) {
    ctx.strokeStyle = "rgba(0,255,136,0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(-14 * s, -2 * s, 28 * s, 36 * s);
    // Speed lines behind player
    ctx.strokeStyle = "rgba(0,255,136,0.3)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const ly = 8 * s + i * 8 * s;
      const lx = -16 * s - i * 4 * s;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx - 10 * s, ly);
      ctx.stroke();
    }
  }

  // --- Magnet aura ---
  if (hasMagnet) {
    ctx.strokeStyle = "rgba(255,68,255,0.4)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(-16 * s, -4 * s, 32 * s, 40 * s);
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function drawCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  tier: "bronze" | "silver" | "gold",
  time: number,
) {
  const cfg = COIN_TIERS[tier];
  const bob = Math.sin(time * 0.004 + x * 0.01) * 3;
  const dy = y + bob;

  // Glow
  ctx.shadowColor = cfg.glowColor;
  ctx.shadowBlur = tier === "gold" ? 14 : 8;

  // Outer coin
  ctx.fillStyle = cfg.color;
  ctx.beginPath();
  ctx.arc(x, dy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Inner highlight
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.arc(x - radius * 0.25, dy - radius * 0.25, radius * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.fillStyle = cfg.innerColor;
  ctx.font = `bold ${Math.max(radius - 2, 8)}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(cfg.label, x, dy + 1);
}

function drawPowerUp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  type: "speed" | "magnet",
  lifeLeft: number,
  time: number,
) {
  const isMagnet = type === "magnet";
  const pulse = 1 + Math.sin(time * 0.008) * 0.15;
  const r = radius * pulse;
  const bob = Math.sin(time * 0.005 + x * 0.02) * 4;
  const dy = y + bob;

  ctx.shadowColor = isMagnet ? "#ff44ff" : "#00ff88";
  ctx.shadowBlur = 18;

  ctx.beginPath();
  ctx.arc(x, dy, r, 0, Math.PI * 2);
  ctx.fillStyle = isMagnet
    ? `rgba(255,68,255,${0.3 + lifeLeft * 0.5})`
    : `rgba(0,255,136,${0.3 + lifeLeft * 0.5})`;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${radius}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(isMagnet ? "@" : ">>", x, dy + 1);
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, ox: number, time: number) {
  const ex = enemy.position.x - ox;
  const ey = enemy.position.y;
  const { width: ew, height: eh } = enemy;

  if (enemy.type === "goomba") {
    const s = ew / 28;
    const frame = Math.floor(enemy.walkTimer) % 2;

    // Body (brown mushroom shape)
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(ex + 2 * s, ey, 24 * s, 18 * s);
    // Head dome
    ctx.fillStyle = "#a0522d";
    ctx.fillRect(ex, ey + 2 * s, 28 * s, 12 * s);
    ctx.fillRect(ex + 2 * s, ey, 24 * s, 4 * s);

    // Angry eyebrows
    ctx.fillStyle = "#000000";
    ctx.fillRect(ex + 4 * s, ey + 6 * s, 6 * s, 2 * s);
    ctx.fillRect(ex + 18 * s, ey + 6 * s, 6 * s, 2 * s);

    // Eyes (white with black pupils)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(ex + 6 * s, ey + 8 * s, 5 * s, 5 * s);
    ctx.fillRect(ex + 17 * s, ey + 8 * s, 5 * s, 5 * s);
    ctx.fillStyle = "#000000";
    ctx.fillRect(ex + 8 * s, ey + 9 * s, 3 * s, 3 * s);
    ctx.fillRect(ex + 19 * s, ey + 9 * s, 3 * s, 3 * s);

    // Mouth
    ctx.fillStyle = "#000000";
    ctx.fillRect(ex + 10 * s, ey + 14 * s, 8 * s, 2 * s);

    // Feet (alternate for walk animation)
    ctx.fillStyle = "#2b1810";
    if (frame === 0) {
      ctx.fillRect(ex + 1 * s, ey + 18 * s, 10 * s, 10 * s);
      ctx.fillRect(ex + 17 * s, ey + 18 * s, 10 * s, 10 * s);
    } else {
      ctx.fillRect(ex + 3 * s, ey + 18 * s, 10 * s, 10 * s);
      ctx.fillRect(ex + 15 * s, ey + 18 * s, 10 * s, 10 * s);
    }
  } else {
    // Spike — static triangular hazard
    const pulse = 1 + Math.sin(time * 0.006) * 0.05;

    ctx.fillStyle = "#888888";
    ctx.fillRect(ex, ey + eh * 0.6, ew, eh * 0.4);

    // Spike triangles
    ctx.fillStyle = "#cccccc";
    const spikes = 4;
    const sw = ew / spikes;
    for (let i = 0; i < spikes; i++) {
      const sx = ex + i * sw;
      ctx.beginPath();
      ctx.moveTo(sx, ey + eh * 0.6);
      ctx.lineTo(sx + sw / 2, ey + eh * (0.6 - 0.55 * pulse));
      ctx.lineTo(sx + sw, ey + eh * 0.6);
      ctx.fill();
    }

    // Danger highlight on tips
    ctx.fillStyle = "#ff4444";
    for (let i = 0; i < spikes; i++) {
      const tipX = ex + i * sw + sw / 2;
      const tipY = ey + eh * (0.6 - 0.55 * pulse);
      ctx.fillRect(tipX - 1, tipY, 2, 3);
    }
  }
}

function drawPopups(ctx: CanvasRenderingContext2D, popups: GameState["popups"], ox: number) {
  for (const p of popups) {
    const progress = p.age / p.duration;
    const alpha = 1 - progress;
    const rise = progress * 40; // float upward 40px over lifetime

    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Outline for readability
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = 3;
    ctx.strokeText(p.text, p.x - ox, p.y - rise);
    ctx.fillText(p.text, p.x - ox, p.y - rise);
  }
  ctx.globalAlpha = 1;
}

function drawMagnetRange(ctx: CanvasRenderingContext2D, px: number, py: number, time: number) {
  const { MAGNET_RANGE } = GAME_CONFIG;
  const alpha = 0.06 + Math.sin(time * 0.005) * 0.03;
  ctx.beginPath();
  ctx.arc(px, py, MAGNET_RANGE, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,68,255,${alpha})`;
  ctx.fill();

  ctx.strokeStyle = `rgba(255,68,255,${0.2 + Math.sin(time * 0.008) * 0.1})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.lineDashOffset = -time * 0.03;
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawEffects(ctx: CanvasRenderingContext2D, effects: GameState["effects"], ox: number) {
  for (const fx of effects) {
    for (const p of fx.particles) {
      if (p.life <= 0) continue;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - ox - p.size * p.life, p.y - p.size * p.life, p.size * p.life * 2, p.size * p.life * 2);
    }
  }
  ctx.globalAlpha = 1;
}

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState) {
  const { CANVAS_WIDTH } = GAME_CONFIG;

  // HUD background
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, CANVAS_WIDTH, 32);

  ctx.font = "bold 16px monospace";
  ctx.textBaseline = "top";

  // Score
  ctx.fillStyle = "#ffd700";
  ctx.textAlign = "left";
  ctx.fillText(`$ ${state.player.score}`, 10, 7);

  // Difficulty
  const diffColors: Record<string, string> = {
    Easy: "#44ff44", Medium: "#ffdd44", Hard: "#ff8844", Expert: "#ff4444", Legendary: "#ff44ff",
  };
  ctx.fillStyle = diffColors[state.difficulty.label] ?? "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(state.difficulty.label, CANVAS_WIDTH / 2, 7);

  // Timer
  ctx.fillStyle = state.timeLeft <= 10 ? "#ff4444" : "#ffffff";
  ctx.textAlign = "right";
  ctx.fillText(`${state.timeLeft}s`, CANVAS_WIDTH - 10, 7);

  // Active boost indicators
  const now = Date.now();
  let bx = 10;
  for (const b of state.player.boosts) {
    const remaining = Math.max(0, (b.endsAt - now) / 1000);
    ctx.fillStyle = b.type === "speed" ? "#00ff88" : "#ff44ff";
    ctx.textAlign = "left";
    ctx.font = "bold 11px monospace";
    ctx.fillText(`${b.type === "speed" ? ">>" : "@"} ${remaining.toFixed(1)}s`, bx, 22);
    bx += 80;
  }
}

function drawOverlay(ctx: CanvasRenderingContext2D, status: "idle" | "ended", score: number) {
  const { CANVAS_WIDTH, CANVAS_HEIGHT } = GAME_CONFIG;

  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (status === "ended") {
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 36px monospace";
    ctx.fillText("Time's Up!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px monospace";
    ctx.fillText(`Final Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);

    ctx.fillStyle = "#aaaaaa";
    ctx.font = "16px monospace";
    ctx.fillText("Press SPACE to play again", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
  } else {
    // Idle
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 32px monospace";
    ctx.fillText("Coin Collector", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);

    ctx.fillStyle = "#ffffff";
    ctx.font = "16px monospace";
    ctx.fillText("Arrow Keys / WASD to move", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.fillText("SPACE or UP to jump", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 24);

    ctx.fillStyle = "#00d4ff";
    ctx.font = "bold 20px monospace";
    ctx.fillText("Press SPACE to start", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 64);
  }
}

// --- Main component ---

export function GameCanvas({ state }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { CANVAS_WIDTH, CANVAS_HEIGHT } = GAME_CONFIG;
    const ox = state.cameraX; // Camera offset
    const now = Date.now();

    // --- Sky ---
    drawSky(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);

    // --- Clouds (parallax) ---
    drawParallaxClouds(ctx, state.cameraX, CANVAS_WIDTH);

    // --- Platforms (grass/dirt tiles) ---
    for (const plat of state.platforms) {
      // Cull off-screen platforms
      if (plat.x + plat.width < ox - 64 || plat.x > ox + CANVAS_WIDTH + 64) continue;
      drawPlatform(ctx, plat, ox);
    }

    // --- Magnet range ---
    const { player } = state;
    const hasMagnet = player.boosts.some((b) => b.type === "magnet");
    const hasSpeed = player.boosts.some((b) => b.type === "speed");

    if (hasMagnet) {
      drawMagnetRange(
        ctx,
        player.position.x + player.width / 2 - ox,
        player.position.y + player.height / 2,
        now,
      );
    }

    // --- Coins ---
    ctx.shadowBlur = 0;
    for (const coin of state.coins) {
      if (coin.collected) continue;
      const cx = coin.position.x - ox;
      if (cx < -20 || cx > CANVAS_WIDTH + 20) continue;
      drawCoin(ctx, cx, coin.position.y, coin.radius, coin.tier, now);
    }
    ctx.shadowBlur = 0;

    // --- Power-ups ---
    for (const pu of state.powerUps) {
      if (pu.collected) continue;
      const pux = pu.position.x - ox;
      if (pux < -20 || pux > CANVAS_WIDTH + 20) continue;
      const lifeLeft = 1 - (now - pu.spawnedAt) / GAME_CONFIG.POWERUP_LIFETIME;
      drawPowerUp(ctx, pux, pu.position.y, pu.radius, pu.type, lifeLeft, now);
    }
    ctx.shadowBlur = 0;

    // --- Enemies ---
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      const ex = enemy.position.x - ox;
      if (ex + enemy.width < -20 || ex > CANVAS_WIDTH + 20) continue;
      drawEnemy(ctx, enemy, ox, now);
    }

    // --- Effects (particles) ---
    drawEffects(ctx, state.effects, ox);

    // --- Score popups ---
    drawPopups(ctx, state.popups, ox);

    // --- Player ---
    drawPlayer(
      ctx,
      player.position.x - ox,
      player.position.y,
      player.width,
      player.height,
      player.facing,
      player.grounded,
      player.walkTimer,
      hasSpeed,
      hasMagnet,
      now,
    );

    // --- HUD ---
    drawHUD(ctx, state);

    // --- Overlay (idle / game over) ---
    if (state.status !== "playing") {
      drawOverlay(ctx, state.status, player.score);
    }
  }, [state]);

  return (
    <canvas
      ref={canvasRef}
      width={GAME_CONFIG.CANVAS_WIDTH}
      height={GAME_CONFIG.CANVAS_HEIGHT}
      style={{
        border: "2px solid #333",
        borderRadius: "8px",
        display: "block",
        imageRendering: "pixelated",
      }}
    />
  );
}
