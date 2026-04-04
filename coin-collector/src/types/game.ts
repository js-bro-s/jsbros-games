export interface Position {
  x: number;
  y: number;
}

export interface Coin {
  id: string;
  position: Position;
  radius: number;
  collected: boolean;
}

export interface Player {
  position: Position;
  radius: number;
  speed: number;
  score: number;
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

export type GameStatus = "idle" | "playing" | "ended";

export interface GameState {
  player: Player;
  coins: Coin[];
  effects: CollectEffect[];
  timeLeft: number;
  status: GameStatus;
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
} as const;
