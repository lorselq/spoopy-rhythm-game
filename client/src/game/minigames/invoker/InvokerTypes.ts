export type TrackId = number;

export type Quadrant = "upperLeft" | "upperRight" | "lowerLeft" | "lowerRight";

export type PieceColor = "red" | "green" | "yellow" | "blue";

/**
 * Difficulty is normalized between 0.0 (easiest) and 1.0 (hardest).
 */
export type Difficulty = number;

export interface InvokerPiece {
  id: string;
  trackId: TrackId;
  quadrant: Quadrant;
  color: PieceColor;
  spawnTime: number;
  currentY: number;
  speed: number;
}

export interface CircleProgress {
  id: number;
  quadrants: Record<Quadrant, boolean>;
}

export interface DifficultyState {
  value: Difficulty;
  /** accumulator that helps schedule spawns based on rate */
  spawnAccumulator: number;
}

export interface InvokerEvents {
  completedCircleIds: number[];
  captured?: { circleId: number; quadrant: Quadrant; color: PieceColor };
  blueGlitch: boolean;
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
