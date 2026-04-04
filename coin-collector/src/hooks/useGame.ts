import { useCallback, useRef, useState } from "react";
import type { ActiveBoost, Coin, CoinTier, CollectEffect, Difficulty, GameState, GameStatus, Particle, PowerUp } from "../types/game";
import { COIN_TIERS, GAME_CONFIG, getDifficulty } from "../types/game";
import { useGameLoop } from "./useGameLoop";
import type { Keys } from "./useKeyboard";
import { useKeyboard } from "./useKeyboard";

let idCounter = 0;

function pickCoinTier(): CoinTier {
  const tiers = Object.entries(COIN_TIERS) as [CoinTier, { weight: number }][];
  const totalWeight = tiers.reduce((sum, [, cfg]) => sum + cfg.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const [tier, cfg] of tiers) {
    roll -= cfg.weight;
    if (roll <= 0) return tier;
  }
  return "bronze";
}

function createCoin(radius: number = GAME_CONFIG.COIN_RADIUS): Coin {
  const { CANVAS_WIDTH, CANVAS_HEIGHT } = GAME_CONFIG;
  return {
    id: `coin-${idCounter++}`,
    position: {
      x: radius + Math.random() * (CANVAS_WIDTH - radius * 2),
      y: radius + Math.random() * (CANVAS_HEIGHT - radius * 2),
    },
    radius,
    tier: pickCoinTier(),
    collected: false,
  };
}

function spawnCoins(count: number, radius?: number): Coin[] {
  return Array.from({ length: count }, () => createCoin(radius));
}

function createPowerUp(): PowerUp {
  const { CANVAS_WIDTH, CANVAS_HEIGHT, POWERUP_RADIUS } = GAME_CONFIG;
  return {
    id: `pu-${idCounter++}`,
    type: Math.random() < 0.5 ? "speed" : "magnet",
    position: {
      x: POWERUP_RADIUS + Math.random() * (CANVAS_WIDTH - POWERUP_RADIUS * 2),
      y: POWERUP_RADIUS + Math.random() * (CANVAS_HEIGHT - POWERUP_RADIUS * 2),
    },
    radius: POWERUP_RADIUS,
    collected: false,
    spawnedAt: Date.now(),
  };
}

function createCollectEffect(x: number, y: number, colors?: string[]): CollectEffect {
  const particles: Particle[] = [];
  const palette = colors ?? ["#ffd700", "#ffec80", "#fff4b8", "#ffa500"];
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12;
    const speed = 40 + Math.random() * 60;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 1,
      size: 2 + Math.random() * 3,
      color: palette[Math.floor(Math.random() * palette.length)],
    });
  }
  return { x, y, age: 0, duration: 0.5, particles };
}

function tickEffects(effects: CollectEffect[], dt: number): CollectEffect[] {
  return effects
    .map((fx) => {
      const next = { ...fx, age: fx.age + dt };
      next.particles = fx.particles.map((p) => ({
        ...p,
        x: p.x + p.vx * dt,
        y: p.y + p.vy * dt,
        vy: p.vy + 80 * dt, // gravity
        life: Math.max(0, p.life - dt / p.maxLife),
      }));
      return next;
    })
    .filter((fx) => fx.age < fx.duration);
}

function checkCollision(
  px: number,
  py: number,
  pr: number,
  cx: number,
  cy: number,
  cr: number
): boolean {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy < (pr + cr) * (pr + cr);
}

function createInitialState(): GameState {
  const { CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_RADIUS, PLAYER_SPEED, COIN_COUNT, GAME_DURATION } =
    GAME_CONFIG;
  const difficulty = getDifficulty(0);
  return {
    player: {
      position: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
      radius: PLAYER_RADIUS,
      speed: PLAYER_SPEED,
      baseSpeed: PLAYER_SPEED,
      score: 0,
      boosts: [],
    },
    coins: spawnCoins(COIN_COUNT, difficulty.coinRadius),
    powerUps: [],
    effects: [],
    difficulty,
    timeLeft: GAME_DURATION,
    status: "idle",
  };
}

export interface GameCallbacks {
  onCollect?: () => void;
  onSpeedUp?: () => void;
  onMagnet?: () => void;
  onCountdown?: () => void;
  onGameOver?: () => void;
}

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
      setState((prev) => {
        if (prev.status !== "playing") return prev;

        const next = structuredClone(prev) as GameState;
        const { player, coins } = next;
        const { CANVAS_WIDTH, CANVAS_HEIGHT } = GAME_CONFIG;

        // Move player based on keys
        const k: Keys = keys.current;
        if (k.up) player.position.y -= player.speed;
        if (k.down) player.position.y += player.speed;
        if (k.left) player.position.x -= player.speed;
        if (k.right) player.position.x += player.speed;

        // Clamp to canvas
        player.position.x = Math.max(
          player.radius,
          Math.min(CANVAS_WIDTH - player.radius, player.position.x)
        );
        player.position.y = Math.max(
          player.radius,
          Math.min(CANVAS_HEIGHT - player.radius, player.position.y)
        );

        // Check coin collisions
        for (const coin of coins) {
          if (coin.collected) continue;
          if (
            checkCollision(
              player.position.x,
              player.position.y,
              player.radius,
              coin.position.x,
              coin.position.y,
              coin.radius
            )
          ) {
            coin.collected = true;
            const tierCfg = COIN_TIERS[coin.tier];
            player.score += tierCfg.points;
            next.effects.push(
              createCollectEffect(coin.position.x, coin.position.y, [
                tierCfg.color,
                tierCfg.glowColor,
                "#ffffff",
              ])
            );
            cbRef.current?.onCollect?.();

            // Recalculate difficulty after scoring
            next.difficulty = getDifficulty(player.score);

            // Queue respawn with current difficulty delay
            respawnQueue.current.push(Date.now() + next.difficulty.respawnDelay);
          }
        }

        // Check power-up collisions
        for (const pu of next.powerUps) {
          if (pu.collected) continue;
          if (
            checkCollision(
              player.position.x, player.position.y, player.radius,
              pu.position.x, pu.position.y, pu.radius
            )
          ) {
            pu.collected = true;
            const puColors = pu.type === "magnet"
              ? ["#ff44ff", "#ff88ff", "#ffaaff", "#ffffff"]
              : ["#00ff88", "#44ffaa", "#88ffcc", "#ffffff"];
            next.effects.push(createCollectEffect(pu.position.x, pu.position.y, puColors));

            if (pu.type === "speed") {
              cbRef.current?.onSpeedUp?.();
              player.boosts.push({
                type: "speed",
                endsAt: Date.now() + GAME_CONFIG.SPEED_BOOST_DURATION,
              });
            } else {
              cbRef.current?.onMagnet?.();
              player.boosts.push({
                type: "magnet",
                endsAt: Date.now() + GAME_CONFIG.MAGNET_DURATION,
              });
            }
          }
        }

        // Expire old boosts and recalculate speed
        const now = Date.now();
        player.boosts = player.boosts.filter((b) => b.endsAt > now);
        const hasSpeedBoost = player.boosts.some((b) => b.type === "speed");
        player.speed = hasSpeedBoost
          ? player.baseSpeed * GAME_CONFIG.SPEED_BOOST_MULTIPLIER
          : player.baseSpeed;

        // Magnet: pull nearby coins toward player
        const hasMagnet = player.boosts.some((b) => b.type === "magnet");
        if (hasMagnet) {
          const { MAGNET_RANGE, MAGNET_PULL_SPEED } = GAME_CONFIG;
          for (const coin of next.coins) {
            if (coin.collected) continue;
            const dx = player.position.x - coin.position.x;
            const dy = player.position.y - coin.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < MAGNET_RANGE && dist > 1) {
              const pull = (MAGNET_PULL_SPEED * dt) / dist;
              coin.position.x += dx * pull;
              coin.position.y += dy * pull;
            }
          }
        }

        // Spawn power-ups on interval
        if (now >= nextPowerUpSpawn.current) {
          next.powerUps.push(createPowerUp());
          nextPowerUpSpawn.current = now + GAME_CONFIG.POWERUP_SPAWN_INTERVAL;
        }

        // Remove expired/collected power-ups
        next.powerUps = next.powerUps.filter(
          (pu) => !pu.collected && now - pu.spawnedAt < GAME_CONFIG.POWERUP_LIFETIME
        );

        // Process respawn queue — only spawn if under maxCoins
        const stillWaiting: number[] = [];
        const activeCoins = next.coins.filter((c) => !c.collected).length;
        for (const time of respawnQueue.current) {
          if (now >= time) {
            if (activeCoins + stillWaiting.length < next.difficulty.maxCoins + 2) {
              next.coins.push(createCoin(next.difficulty.coinRadius));
            }
          } else {
            stillWaiting.push(time);
          }
        }
        respawnQueue.current = stillWaiting;

        // Tick effects
        next.effects = tickEffects(next.effects, dt);

        // Timer countdown
        timerAccum.current += dt;
        if (timerAccum.current >= 1) {
          const seconds = Math.floor(timerAccum.current);
          timerAccum.current -= seconds;
          next.timeLeft = Math.max(0, next.timeLeft - seconds);

          // Fire countdown beep for last 10 seconds
          if (next.timeLeft <= 10 && next.timeLeft > 0 && next.timeLeft < prevTimeRef.current) {
            cbRef.current?.onCountdown?.();
          }
          prevTimeRef.current = next.timeLeft;

          if (next.timeLeft <= 0) {
            next.status = "ended";
            cbRef.current?.onGameOver?.();
          }
        }

        // Remove old collected coins (already respawned)
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

  const restart = useCallback(() => {
    start();
  }, [start]);

  return { state, start, restart };
}
