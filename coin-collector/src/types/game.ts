export interface Position {
  x: number;
  y: number;
}

export type CoinTier = "bronze" | "silver" | "gold";

export interface CoinTierConfig {
  color: string;
  glowColor: string;
  innerColor: string;
  label: string;
  points: number;
  weight: number; // spawn probability weight
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

export interface Player {
  position: Position;
  radius: number;
  speed: number;
  baseSpeed: number;
  score: number;
  boosts: ActiveBoost[];
}

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

export interface Difficulty {
  level: number;
  label: string;
  coinRadius: number;
  respawnDelay: number;
  maxCoins: number;
}

export type GameStatus = "idle" | "playing" | "ended";

export interface GameState {
  player: Player;
  coins: Coin[];
  powerUps: PowerUp[];
  effects: CollectEffect[];
  difficulty: Difficulty;
  timeLeft: number;
  status: GameStatus;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
}

export const GAME_CONFIG = {
  CANVAS_WIDTH: 640,
  CANVAS_HEIGHT: 480,
  COIN_COUNT: 10,
  COIN_RADIUS: 12,
  PLAYER_RADIUS: 16,
  PLAYER_SPEED: 4,
  GAME_DURATION: 60,
  RESPAWN_DELAY: 2000,
  POWERUP_RADIUS: 14,
  POWERUP_SPAWN_INTERVAL: 8000,
  POWERUP_LIFETIME: 6000,
  SPEED_BOOST_MULTIPLIER: 1.8,
  SPEED_BOOST_DURATION: 4000,
  MAGNET_DURATION: 5000,
  MAGNET_RANGE: 120,
  MAGNET_PULL_SPEED: 200,
} as const;

// Difficulty ramps every 5 coins collected
export const DIFFICULTY_TIERS: Omit<Difficulty, "level">[] = [
  { label: "Easy",       coinRadius: 12, respawnDelay: 2000, maxCoins: 10 },
  { label: "Medium",     coinRadius: 10, respawnDelay: 1600, maxCoins: 8 },
  { label: "Hard",       coinRadius: 8,  respawnDelay: 1200, maxCoins: 7 },
  { label: "Expert",     coinRadius: 7,  respawnDelay: 900,  maxCoins: 6 },
  { label: "Legendary",  coinRadius: 6,  respawnDelay: 600,  maxCoins: 5 },
];

export function getDifficulty(score: number): Difficulty {
  const level = Math.min(Math.floor(score / 5), DIFFICULTY_TIERS.length - 1);
  return { level, ...DIFFICULTY_TIERS[level] };
}
