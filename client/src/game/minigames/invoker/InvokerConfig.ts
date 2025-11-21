import { type PieceColor, type TrackId } from "./InvokerTypes";

export interface DifficultyConfig {
  min: number;
  max: number;
  midpoint: number;
  driftPerSecond: number;
  pieceFillDelta: number;
  completionDelta: number;
  overCollectionBase: number;
  overCollectionScale: number;
}

export interface SpawnConfig {
  baseRate: number;
  maxRate: number;
  baseFallSpeed: number;
  maxFallSpeed: number;
}

export interface InvokerConfig {
  tracks: number;
  keybindings: string[];
  screenHeight: number;
  collectionLineY: number;
  hitWindow: number;
  difficulty: DifficultyConfig;
  spawn: SpawnConfig;
  availableColors: PieceColor[];
}

export const defaultInvokerConfig: InvokerConfig = {
  tracks: 5,
  keybindings: ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG"],
  screenHeight: 720,
  collectionLineY: 640,
  hitWindow: 40,
  difficulty: {
    min: 0,
    max: 1,
    midpoint: 0.5,
    driftPerSecond: 0.02,
    pieceFillDelta: 0.006,
    completionDelta: 0.03,
    overCollectionBase: 0.08,
    overCollectionScale: 0.06,
  },
  spawn: {
    baseRate: 1.2,
    maxRate: 5,
    baseFallSpeed: 120,
    maxFallSpeed: 420,
  },
  availableColors: ["red", "green", "yellow", "blue"],
};

export const clampDifficulty = (value: number, config: DifficultyConfig) =>
  Math.min(config.max, Math.max(config.min, value));

export const trackIdFromKey = (
  key: string,
  config: InvokerConfig
): TrackId | null => {
  const index = config.keybindings.indexOf(key);
  return index === -1 ? null : index;
};
