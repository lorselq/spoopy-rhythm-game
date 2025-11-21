import { PieceColor, Quadrant, TrackId } from "./InvokerTypes";

export interface DifficultyConfig {
  min: number;
  max: number;
  driftPerSecond: number;
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
  availableQuadrants: Quadrant[];
}

export const defaultInvokerConfig: InvokerConfig = {
  tracks: 5,
  keybindings: ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG"],
  screenHeight: 720,
  collectionLineY: 640,
  hitWindow: 28,
  difficulty: {
    min: 0,
    max: 1,
    driftPerSecond: 0.015,
    completionDelta: 0.05,
    overCollectionBase: 0.03,
    overCollectionScale: 0.12,
  },
  spawn: {
    baseRate: 1.2,
    maxRate: 5,
    baseFallSpeed: 120,
    maxFallSpeed: 420,
  },
  availableColors: ["red", "green", "yellow", "blue"],
  availableQuadrants: [
    "upperLeft",
    "upperRight",
    "lowerLeft",
    "lowerRight",
  ],
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
