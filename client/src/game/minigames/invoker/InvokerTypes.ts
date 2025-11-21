export type TrackId = number;

export type PieceColor = "red" | "green" | "yellow" | "blue";

export type Quadrant = "upperLeft" | "upperRight" | "lowerLeft" | "lowerRight";

/**
 * Difficulty is normalized between 0.0 (easiest) and 1.0 (hardest).
 */
export type Difficulty = number;

export interface InvokerPiece {
  id: string;
  trackId: TrackId;
  color: PieceColor;
  spawnTime: number;
  currentY: number;
  speed: number;
}

export interface CircleProgress {
  id: number;
  colors: Record<PieceColor, boolean>;
}

export interface DifficultyState {
  value: Difficulty;
  /** accumulator that helps schedule spawns based on rate */
  spawnAccumulator: number;
}

export interface InvokerEvents {
  completedCircleIds: number[];
  captured?: { circleId: number; color: PieceColor };
  glitchColor?: PieceColor;
  overCollection: boolean;
}

export interface InvokerState {
  time: number;
  pieces: InvokerPiece[];
  difficulty: DifficultyState;
  circleProgress: CircleProgress[];
  score: number;
  paused: boolean;
  events: InvokerEvents;
}

export interface BeatInfo {
  beatIndex: number;
  beatPhase: number;
  currentTime: number;
}
