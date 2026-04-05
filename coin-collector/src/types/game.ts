export interface Position {
  x: number;
  y: number;
}

// --- Coin tiers ---
export type CoinTier = "bronze" | "silver" | "gold";

export interface CoinTierConfig {
  color: string;
  glowColor: string;
  innerColor: string;
  label: string;
  points: number;
  weight: number;
}

export const COIN_TIERS: Record<CoinTier, CoinTierConfig> = {
  bronze: { color: "#cd7f32", glowColor: "#cd7f32", innerColor: "#8b4513", label: "1", points: 1, weight: 60 },
  silver: { color: "#c0c0c0", glowColor: "#e0e0e0", innerColor: "#808080", label: "3", points: 3, weight: 30 },
  gold:   { color: "#ffd700", glowColor: "#ffd700", innerColor: "#b8860b", label: "5", points: 5, weight: 10 },
};

export interface Coin {
  id: string;
  position: Position;
  radius: number;
  tier: CoinTier;
  collected: boolean;
}

// --- Power-ups ---
export type PowerUpType = "speed" | "magnet";

export interface PowerUp {
  id: string;
  type: PowerUpType;
  position: Position;
  radius: number;
  collected: boolean;
  spawnedAt: number;
}

export interface ActiveBoost {
  type: PowerUpType;
  endsAt: number;
}

// --- Platformer player ---
export interface Player {
  position: Position;
  vy: number;
  width: number;
  height: number;
  speed: number;
  baseSpeed: number;
  jumpForce: number;
  grounded: boolean;
  facing: 1 | -1;
  walkTimer: number;
  score: number;
  boosts: ActiveBoost[];
}

// --- Platforms ---
export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

// --- Enemies ---
export type EnemyType = "goomba" | "spike";

export interface Enemy {
  id: string;
  type: EnemyType;
  position: Position;
  width: number;
  height: number;
  vx: number;
  walkTimer: number;
  alive: boolean;
}

// --- Effects ---
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface CollectEffect {
  x: number;
  y: number;
  age: number;
  duration: number;
  particles: Particle[];
}

// --- Score popups ---
export interface ScorePopup {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  age: number;
  duration: number;
}

// --- Difficulty ---
export interface Difficulty {
  level: number;
  label: string;
  coinRadius: number;
  respawnDelay: number;
  maxCoins: number;
}

export type GameStatus = "idle" | "playing" | "ended";

// --- World / camera ---
export interface GameState {
  player: Player;
  coins: Coin[];
  powerUps: PowerUp[];
  enemies: Enemy[];
  platforms: Platform[];
  effects: CollectEffect[];
  popups: ScorePopup[];
  difficulty: Difficulty;
  cameraX: number;
  worldWidth: number;
  timeLeft: number;
  status: GameStatus;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
}

// --- Config ---
export const GAME_CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 480,
  // World
  WORLD_WIDTH: 4000,
  TILE_SIZE: 32,
  GROUND_Y: 416, // ground top = CANVAS_HEIGHT - 2 tiles
  GRAVITY: 1400,
  // Player
  PLAYER_WIDTH: 28,
  PLAYER_HEIGHT: 32,
  PLAYER_SPEED: 260,
  JUMP_FORCE: -680,
  // Game
  COIN_COUNT: 20,
  COIN_RADIUS: 12,
  GAME_DURATION: 60,
  RESPAWN_DELAY: 2000,
  // Power-ups
  POWERUP_RADIUS: 14,
  POWERUP_SPAWN_INTERVAL: 8000,
  POWERUP_LIFETIME: 6000,
  SPEED_BOOST_MULTIPLIER: 1.6,
  SPEED_BOOST_DURATION: 4000,
  MAGNET_DURATION: 5000,
  MAGNET_RANGE: 150,
  MAGNET_PULL_SPEED: 300,
  // Enemies
  ENEMY_COUNT: 8,
  GOOMBA_SPEED: 60,
  GOOMBA_WIDTH: 28,
  GOOMBA_HEIGHT: 28,
  SPIKE_WIDTH: 32,
  SPIKE_HEIGHT: 20,
  STOMP_BOUNCE: -400,
  ENEMY_HIT_PENALTY: 3,
} as const;

export const DIFFICULTY_TIERS: Omit<Difficulty, "level">[] = [
  { label: "Easy",       coinRadius: 12, respawnDelay: 2000, maxCoins: 20 },
  { label: "Medium",     coinRadius: 10, respawnDelay: 1600, maxCoins: 16 },
  { label: "Hard",       coinRadius: 8,  respawnDelay: 1200, maxCoins: 14 },
  { label: "Expert",     coinRadius: 7,  respawnDelay: 900,  maxCoins: 12 },
  { label: "Legendary",  coinRadius: 6,  respawnDelay: 600,  maxCoins: 10 },
];

export function getDifficulty(score: number): Difficulty {
  const level = Math.min(Math.floor(score / 8), DIFFICULTY_TIERS.length - 1);
  return { level, ...DIFFICULTY_TIERS[level] };
}
