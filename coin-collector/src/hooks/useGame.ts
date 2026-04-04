import { useCallback, useRef, useState } from "react";
import type { Coin, CollectEffect, GameState, GameStatus, Particle } from "../types/game";
import { GAME_CONFIG } from "../types/game";
import { useGameLoop } from "./useGameLoop";
import type { Keys } from "./useKeyboard";
import { useKeyboard } from "./useKeyboard";

let coinIdCounter = 0;

function createCoin(): Coin {
  const { CANVAS_WIDTH, CANVAS_HEIGHT, COIN_RADIUS } = GAME_CONFIG;
  return {
    id: `coin-${coinIdCounter++}`,
    position: {
      x: COIN_RADIUS + Math.random() * (CANVAS_WIDTH - COIN_RADIUS * 2),
      y: COIN_RADIUS + Math.random() * (CANVAS_HEIGHT - COIN_RADIUS * 2),
    },
    radius: COIN_RADIUS,
    collected: false,
  };
}

function spawnCoins(count: number): Coin[] {
  return Array.from({ length: count }, () => createCoin());
}

function createCollectEffect(x: number, y: number): CollectEffect {
  const particles: Particle[] = [];
  const colors = ["#ffd700", "#ffec80", "#fff4b8", "#ffa500"];
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
      color: colors[Math.floor(Math.random() * colors.length)],
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
  return {
    player: {
      position: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
      radius: PLAYER_RADIUS,
      speed: PLAYER_SPEED,
      score: 0,
    },
    coins: spawnCoins(COIN_COUNT),
    effects: [],
    timeLeft: GAME_DURATION,
    status: "idle",
  };
}

export interface GameCallbacks {
  onCollect?: () => void;
  onCountdown?: () => void;
  onGameOver?: () => void;
}

export function useGame(callbacks?: GameCallbacks) {
  const [state, setState] = useState<GameState>(createInitialState);
  const keys = useKeyboard();
  const timerAccum = useRef(0);
  const respawnQueue = useRef<number[]>([]);
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
            player.score += 1;
            next.effects.push(createCollectEffect(coin.position.x, coin.position.y));
            cbRef.current?.onCollect?.();
            // Queue respawn
            respawnQueue.current.push(Date.now() + GAME_CONFIG.RESPAWN_DELAY);
          }
        }

        // Process respawn queue
        const now = Date.now();
        const stillWaiting: number[] = [];
        for (const time of respawnQueue.current) {
          if (now >= time) {
            next.coins.push(createCoin());
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
    coinIdCounter = 0;
    timerAccum.current = 0;
    respawnQueue.current = [];
    setState({ ...createInitialState(), status: "playing" });
  }, []);

  const restart = useCallback(() => {
    start();
  }, [start]);

  return { state, start, restart };
}
