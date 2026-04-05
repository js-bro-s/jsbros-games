import { useCallback, useRef, useState } from "react";
import type { Coin, CoinTier, CollectEffect, Enemy, GameState, Particle, Platform, PowerUp, ScorePopup } from "../types/game";
import { COIN_TIERS, GAME_CONFIG, getDifficulty } from "../types/game";
import { useGameLoop } from "./useGameLoop";
import type { Keys } from "./useKeyboard";
import { useKeyboard } from "./useKeyboard";

let idCounter = 0;

// --- Coin tier weighted random ---
function pickCoinTier(): CoinTier {
  const tiers = Object.entries(COIN_TIERS) as [CoinTier, { weight: number }][];
  const total = tiers.reduce((s, [, c]) => s + c.weight, 0);
  let roll = Math.random() * total;
  for (const [tier, cfg] of tiers) {
    roll -= cfg.weight;
    if (roll <= 0) return tier;
  }
  return "bronze";
}

// --- Generate platforms ---
function generatePlatforms(): Platform[] {
  const { WORLD_WIDTH, TILE_SIZE, GROUND_Y } = GAME_CONFIG;
  const platforms: Platform[] = [];

  // Ground segments (with occasional gaps)
  let x = 0;
  while (x < WORLD_WIDTH) {
    const segWidth = (4 + Math.floor(Math.random() * 8)) * TILE_SIZE;
    platforms.push({ x, y: GROUND_Y, width: segWidth, height: TILE_SIZE * 2 });
    x += segWidth;
    // Small gap sometimes (not at very start)
    if (x > TILE_SIZE * 8 && Math.random() < 0.3) {
      x += TILE_SIZE * (2 + Math.floor(Math.random() * 2));
    }
  }

  // Floating platforms
  for (let px = 200; px < WORLD_WIDTH - 200; px += 160 + Math.random() * 200) {
    const pw = (2 + Math.floor(Math.random() * 3)) * TILE_SIZE;
    const py = GROUND_Y - (2 + Math.floor(Math.random() * 3)) * TILE_SIZE;
    platforms.push({ x: px, y: py, width: pw, height: TILE_SIZE });
  }

  return platforms;
}

// --- Spawn coins on/above platforms ---
function createCoin(platforms: Platform[], radius: number): Coin {
  const plat = platforms[Math.floor(Math.random() * platforms.length)];
  const cx = plat.x + radius + Math.random() * Math.max(0, plat.width - radius * 2);
  // Float 1-4 tiles above the platform
  const cy = plat.y - GAME_CONFIG.TILE_SIZE * (1 + Math.random() * 3);
  return {
    id: `coin-${idCounter++}`,
    position: { x: cx, y: cy },
    radius,
    tier: pickCoinTier(),
    collected: false,
  };
}

function spawnCoins(count: number, platforms: Platform[], radius: number): Coin[] {
  return Array.from({ length: count }, () => createCoin(platforms, radius));
}

function createPowerUp(platforms: Platform[]): PowerUp {
  const { POWERUP_RADIUS, TILE_SIZE } = GAME_CONFIG;
  const plat = platforms[Math.floor(Math.random() * platforms.length)];
  const px = plat.x + POWERUP_RADIUS + Math.random() * Math.max(0, plat.width - POWERUP_RADIUS * 2);
  const py = plat.y - TILE_SIZE * (2 + Math.random() * 2);
  return {
    id: `pu-${idCounter++}`,
    type: Math.random() < 0.5 ? "speed" : "magnet",
    position: { x: px, y: py },
    radius: POWERUP_RADIUS,
    collected: false,
    spawnedAt: Date.now(),
  };
}

// --- Enemies ---
function spawnEnemies(platforms: Platform[]): Enemy[] {
  const { ENEMY_COUNT, GOOMBA_SPEED, GOOMBA_WIDTH, GOOMBA_HEIGHT, SPIKE_WIDTH, SPIKE_HEIGHT, GROUND_Y } = GAME_CONFIG;
  const enemies: Enemy[] = [];
  // Only spawn on ground platforms, spread out across the world
  const groundPlats = platforms.filter((p) => p.y >= GROUND_Y - 4 && p.width >= 128);
  if (groundPlats.length === 0) return enemies;

  for (let i = 0; i < ENEMY_COUNT; i++) {
    const plat = groundPlats[i % groundPlats.length];
    const isSpike = Math.random() < 0.3;
    const ew = isSpike ? SPIKE_WIDTH : GOOMBA_WIDTH;
    const eh = isSpike ? SPIKE_HEIGHT : GOOMBA_HEIGHT;
    const ex = plat.x + 40 + Math.random() * Math.max(0, plat.width - 80 - ew);
    enemies.push({
      id: `enemy-${idCounter++}`,
      type: isSpike ? "spike" : "goomba",
      position: { x: ex, y: plat.y - eh },
      width: ew,
      height: eh,
      vx: isSpike ? 0 : (Math.random() < 0.5 ? GOOMBA_SPEED : -GOOMBA_SPEED),
      walkTimer: 0,
      alive: true,
    });
  }
  return enemies;
}

// --- Effects ---
function createCollectEffect(x: number, y: number, colors?: string[]): CollectEffect {
  const particles: Particle[] = [];
  const palette = colors ?? ["#ffd700", "#ffec80", "#fff4b8", "#ffa500"];
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12;
    const speed = 60 + Math.random() * 80;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1, maxLife: 1,
      size: 2 + Math.random() * 3,
      color: palette[Math.floor(Math.random() * palette.length)],
    });
  }
  return { x, y, age: 0, duration: 0.5, particles };
}

function tickEffects(effects: CollectEffect[], dt: number): CollectEffect[] {
  return effects
    .map((fx) => ({
      ...fx,
      age: fx.age + dt,
      particles: fx.particles.map((p) => ({
        ...p,
        x: p.x + p.vx * dt,
        y: p.y + p.vy * dt,
        vy: p.vy + 200 * dt,
        life: Math.max(0, p.life - dt * 2),
      })),
    }))
    .filter((fx) => fx.age < fx.duration);
}

function createPopup(x: number, y: number, points: number): ScorePopup {
  return {
    id: `pop-${idCounter++}`,
    x, y,
    text: points > 0 ? `+${points}` : `${points}`,
    color: points > 0 ? "#ffd700" : "#ff4444",
    age: 0,
    duration: 0.8,
  };
}

// --- Collision helpers ---
function circleRect(cx: number, cy: number, cr: number, rx: number, ry: number, rw: number, rh: number): boolean {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr;
}

function rectsOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// --- Initial state ---
function createInitialState(): GameState {
  const { CANVAS_WIDTH, PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_SPEED, JUMP_FORCE, COIN_COUNT, GAME_DURATION, WORLD_WIDTH, GROUND_Y } = GAME_CONFIG;
  const difficulty = getDifficulty(0);
  const platforms = generatePlatforms();
  return {
    player: {
      position: { x: CANVAS_WIDTH / 2, y: GROUND_Y - PLAYER_HEIGHT },
      vy: 0,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      speed: PLAYER_SPEED,
      baseSpeed: PLAYER_SPEED,
      jumpForce: JUMP_FORCE,
      grounded: true,
      facing: 1,
      walkTimer: 0,
      score: 0,
      boosts: [],
    },
    coins: spawnCoins(COIN_COUNT, platforms, difficulty.coinRadius),
    powerUps: [],
    enemies: spawnEnemies(platforms),
    platforms,
    effects: [],
    popups: [],
    difficulty,
    cameraX: 0,
    worldWidth: WORLD_WIDTH,
    timeLeft: GAME_DURATION,
    status: "idle",
  };
}

// --- Callbacks ---
export interface GameCallbacks {
  onCollect?: () => void;
  onSpeedUp?: () => void;
  onMagnet?: () => void;
  onCountdown?: () => void;
  onGameOver?: () => void;
  onJump?: () => void;
  onStomp?: () => void;
  onHurt?: () => void;
}

// --- Main hook ---
export function useGame(callbacks?: GameCallbacks) {
  const [state, setState] = useState<GameState>(createInitialState);
  const keys = useKeyboard();
  const timerAccum = useRef(0);
  const respawnQueue = useRef<number[]>([]);
  const nextPowerUpSpawn = useRef(Date.now() + GAME_CONFIG.POWERUP_SPAWN_INTERVAL);
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;
  const prevTimeRef = useRef(GAME_CONFIG.GAME_DURATION);

  const update = useCallback(
    (dt: number) => {
      // Cap dt to prevent tunneling on tab-switch
      const cdt = Math.min(dt, 0.05);

      setState((prev) => {
        if (prev.status !== "playing") return prev;

        const next = structuredClone(prev) as GameState;
        const { player } = next;
        const { CANVAS_WIDTH, CANVAS_HEIGHT, GRAVITY, MAGNET_RANGE, MAGNET_PULL_SPEED, SPEED_BOOST_MULTIPLIER } = GAME_CONFIG;

        // --- Horizontal movement ---
        const k: Keys = keys.current;
        let moveX = 0;
        if (k.left) { moveX = -1; player.facing = -1; }
        if (k.right) { moveX = 1; player.facing = 1; }
        player.position.x += moveX * player.speed * cdt;

        // Walk animation timer
        if (moveX !== 0 && player.grounded) {
          player.walkTimer += cdt * 8; // 8 frames per second cycle
        } else {
          player.walkTimer = 0;
        }

        // Jump
        if ((k.up || k.jump) && player.grounded) {
          player.vy = player.jumpForce;
          player.grounded = false;
          cbRef.current?.onJump?.();
        }

        // --- Gravity ---
        player.vy += GRAVITY * cdt;
        player.position.y += player.vy * cdt;

        // --- Platform collisions ---
        player.grounded = false;
        for (const plat of next.platforms) {
          if (rectsOverlap(
            player.position.x, player.position.y, player.width, player.height,
            plat.x, plat.y, plat.width, plat.height
          )) {
            // Only land if falling downward and was above the platform
            const prevBottom = player.position.y + player.height - player.vy * cdt;
            if (player.vy >= 0 && prevBottom <= plat.y + 4) {
              player.position.y = plat.y - player.height;
              player.vy = 0;
              player.grounded = true;
            }
          }
        }

        // Clamp horizontally to world
        player.position.x = Math.max(0, Math.min(next.worldWidth - player.width, player.position.x));

        // Fall off bottom = reset to nearest platform
        if (player.position.y > CANVAS_HEIGHT + 100) {
          player.position.y = GAME_CONFIG.GROUND_Y - player.height - 50;
          player.vy = 0;
          // Find nearest ground platform
          let bestPlat = next.platforms[0];
          let bestDist = Infinity;
          for (const p of next.platforms) {
            if (p.y >= GAME_CONFIG.GROUND_Y - 10) {
              const d = Math.abs(p.x + p.width / 2 - player.position.x);
              if (d < bestDist) { bestDist = d; bestPlat = p; }
            }
          }
          player.position.x = bestPlat.x + bestPlat.width / 2 - player.width / 2;
          player.position.y = bestPlat.y - player.height;
        }

        // --- Camera follow ---
        const targetCam = player.position.x - CANVAS_WIDTH / 3;
        next.cameraX += (targetCam - next.cameraX) * 0.1;
        next.cameraX = Math.max(0, Math.min(next.worldWidth - CANVAS_WIDTH, next.cameraX));

        // --- Coin collisions ---
        const pcx = player.position.x + player.width / 2;
        const pcy = player.position.y + player.height / 2;
        const pcr = Math.max(player.width, player.height) / 2;

        for (const coin of next.coins) {
          if (coin.collected) continue;
          if (circleRect(coin.position.x, coin.position.y, coin.radius,
            player.position.x, player.position.y, player.width, player.height)) {
            coin.collected = true;
            const tierCfg = COIN_TIERS[coin.tier];
            player.score += tierCfg.points;
            next.effects.push(createCollectEffect(coin.position.x, coin.position.y, [tierCfg.color, tierCfg.glowColor, "#ffffff"]));
            next.popups.push(createPopup(coin.position.x, coin.position.y, tierCfg.points));
            cbRef.current?.onCollect?.();
            next.difficulty = getDifficulty(player.score);
            respawnQueue.current.push(Date.now() + next.difficulty.respawnDelay);
          }
        }

        // --- Power-up collisions ---
        for (const pu of next.powerUps) {
          if (pu.collected) continue;
          if (circleRect(pu.position.x, pu.position.y, pu.radius,
            player.position.x, player.position.y, player.width, player.height)) {
            pu.collected = true;
            const puColors = pu.type === "magnet"
              ? ["#ff44ff", "#ff88ff", "#ffaaff", "#ffffff"]
              : ["#00ff88", "#44ffaa", "#88ffcc", "#ffffff"];
            next.effects.push(createCollectEffect(pu.position.x, pu.position.y, puColors));

            if (pu.type === "speed") {
              cbRef.current?.onSpeedUp?.();
              player.boosts.push({ type: "speed", endsAt: Date.now() + GAME_CONFIG.SPEED_BOOST_DURATION });
            } else {
              cbRef.current?.onMagnet?.();
              player.boosts.push({ type: "magnet", endsAt: Date.now() + GAME_CONFIG.MAGNET_DURATION });
            }
          }
        }

        // --- Enemy movement & collision ---
        for (const enemy of next.enemies) {
          if (!enemy.alive) continue;

          // Goomba patrol: walk back and forth
          if (enemy.type === "goomba") {
            enemy.position.x += enemy.vx * cdt;
            enemy.walkTimer += cdt * 6;

            // Reverse at platform edges (find the platform this enemy is on)
            let onPlat = false;
            for (const plat of next.platforms) {
              if (enemy.position.y + enemy.height >= plat.y &&
                  enemy.position.y + enemy.height <= plat.y + 8 &&
                  enemy.position.x + enemy.width > plat.x &&
                  enemy.position.x < plat.x + plat.width) {
                onPlat = true;
                // Reverse if about to walk off edge
                if (enemy.position.x <= plat.x + 4) { enemy.vx = Math.abs(enemy.vx); }
                if (enemy.position.x + enemy.width >= plat.x + plat.width - 4) { enemy.vx = -Math.abs(enemy.vx); }
                break;
              }
            }
            if (!onPlat) { enemy.vx = -enemy.vx; }
          }

          // Player collision
          if (rectsOverlap(
            player.position.x, player.position.y, player.width, player.height,
            enemy.position.x, enemy.position.y, enemy.width, enemy.height
          )) {
            const playerBottom = player.position.y + player.height;
            const enemyTop = enemy.position.y;
            const wasFalling = player.vy > 0;

            if (wasFalling && playerBottom - player.vy * cdt <= enemyTop + 8 && enemy.type === "goomba") {
              // Stomp! Kill goomba, bounce player
              enemy.alive = false;
              player.vy = GAME_CONFIG.STOMP_BOUNCE;
              player.score += 2;
              next.effects.push(createCollectEffect(
                enemy.position.x + enemy.width / 2,
                enemy.position.y,
                ["#ff8844", "#ffaa66", "#ffffff"]
              ));
              next.popups.push(createPopup(enemy.position.x + enemy.width / 2, enemy.position.y, 2));
              cbRef.current?.onStomp?.();
            } else {
              // Hit by enemy — lose points, knockback
              const penalty = GAME_CONFIG.ENEMY_HIT_PENALTY;
              player.score = Math.max(0, player.score - penalty);
              player.vy = -300;
              player.position.y -= 10;
              const pushDir = player.position.x < enemy.position.x ? -1 : 1;
              player.position.x += pushDir * 40;
              next.effects.push(createCollectEffect(
                player.position.x + player.width / 2,
                player.position.y + player.height / 2,
                ["#ff4444", "#ff8888", "#ffffff"]
              ));
              next.popups.push(createPopup(player.position.x + player.width / 2, player.position.y, -penalty));
              cbRef.current?.onHurt?.();
            }
          }
        }
        // Remove dead enemies
        next.enemies = next.enemies.filter((e) => e.alive);

        // --- Expire boosts / recalc speed ---
        const now = Date.now();
        player.boosts = player.boosts.filter((b) => b.endsAt > now);
        const hasSpeed = player.boosts.some((b) => b.type === "speed");
        player.speed = hasSpeed ? player.baseSpeed * SPEED_BOOST_MULTIPLIER : player.baseSpeed;

        // --- Magnet pull ---
        if (player.boosts.some((b) => b.type === "magnet")) {
          for (const coin of next.coins) {
            if (coin.collected) continue;
            const dx = pcx - coin.position.x;
            const dy = pcy - coin.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < MAGNET_RANGE && dist > 1) {
              const pull = (MAGNET_PULL_SPEED * cdt) / dist;
              coin.position.x += dx * pull;
              coin.position.y += dy * pull;
            }
          }
        }

        // --- Spawn power-ups ---
        if (now >= nextPowerUpSpawn.current) {
          next.powerUps.push(createPowerUp(next.platforms));
          nextPowerUpSpawn.current = now + GAME_CONFIG.POWERUP_SPAWN_INTERVAL;
        }
        next.powerUps = next.powerUps.filter((pu) => !pu.collected && now - pu.spawnedAt < GAME_CONFIG.POWERUP_LIFETIME);

        // --- Respawn coins ---
        const stillWaiting: number[] = [];
        const activeCoins = next.coins.filter((c) => !c.collected).length;
        for (const time of respawnQueue.current) {
          if (now >= time) {
            if (activeCoins < next.difficulty.maxCoins) {
              next.coins.push(createCoin(next.platforms, next.difficulty.coinRadius));
            }
          } else {
            stillWaiting.push(time);
          }
        }
        respawnQueue.current = stillWaiting;

        // --- Effects ---
        next.effects = tickEffects(next.effects, cdt);

        // --- Score popups ---
        next.popups = next.popups
          .map((p) => ({ ...p, age: p.age + cdt }))
          .filter((p) => p.age < p.duration);

        // --- Timer ---
        timerAccum.current += cdt;
        if (timerAccum.current >= 1) {
          const seconds = Math.floor(timerAccum.current);
          timerAccum.current -= seconds;
          next.timeLeft = Math.max(0, next.timeLeft - seconds);
          if (next.timeLeft <= 10 && next.timeLeft > 0 && next.timeLeft < prevTimeRef.current) {
            cbRef.current?.onCountdown?.();
          }
          prevTimeRef.current = next.timeLeft;
          if (next.timeLeft <= 0) {
            next.status = "ended";
            cbRef.current?.onGameOver?.();
          }
        }

        // Remove collected coins
        next.coins = next.coins.filter((c) => !c.collected);

        return next;
      });
    },
    [keys]
  );

  useGameLoop(update, state.status === "playing");

  const start = useCallback(() => {
    idCounter = 0;
    timerAccum.current = 0;
    respawnQueue.current = [];
    nextPowerUpSpawn.current = Date.now() + GAME_CONFIG.POWERUP_SPAWN_INTERVAL;
    setState({ ...createInitialState(), status: "playing" });
  }, []);

  const restart = useCallback(() => start(), [start]);

  return { state, start, restart };
}
