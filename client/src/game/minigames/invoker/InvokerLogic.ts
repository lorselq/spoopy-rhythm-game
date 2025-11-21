import {
  type CircleProgress,
  type Difficulty,
  type InvokerPiece,
  type InvokerState,
  type PieceColor,
  type Quadrant,
  type TrackId,
} from "./InvokerTypes";
import {
  type InvokerConfig,
  clampDifficulty,
  defaultInvokerConfig,
  trackIdFromKey,
} from "./InvokerConfig";

const createQuadrantRecord = (): Record<Quadrant, boolean> => ({
  upperLeft: false,
  upperRight: false,
  lowerLeft: false,
  lowerRight: false,
});

const quadrantColorMap: Record<Quadrant, PieceColor> = {
  upperLeft: "blue",
  upperRight: "red",
  lowerLeft: "green",
  lowerRight: "yellow",
};

const nextCircleId = (() => {
  let counter = 0;
  return () => ++counter;
})();

const createCircleProgress = (): CircleProgress => ({
  id: nextCircleId(),
  quadrants: createQuadrantRecord(),
});

const difficultyCurve = (value: Difficulty) => Math.pow(value, 1.6);
const spawnCurve = (value: Difficulty) => Math.pow(value, 1.4);

const nextPieceId = (() => {
  let counter = 0;
  return () => `piece-${counter++}`;
})();

const withResetEvents = (state: InvokerState): InvokerState => ({
  ...state,
  events: {
    completedCircleIds: [],
    captured: undefined,
    blueGlitch: false,
    overCollection: false,
  },
});

export const createInitialInvokerState = (): InvokerState => {
  const circleProgress = Array.from({ length: 3 }, () => createCircleProgress());

  return {
    time: 0,
    pieces: [],
    difficulty: { value: 0.35, spawnAccumulator: 0 },
    circleProgress,
    score: 0,
    paused: true,
    events: {
      completedCircleIds: [],
      captured: undefined,
      blueGlitch: false,
      overCollection: false,
    },
  };
};

const fallSpeedForDifficulty = (
  difficulty: Difficulty,
  config: InvokerConfig
) =>
  config.spawn.baseFallSpeed +
  (config.spawn.maxFallSpeed - config.spawn.baseFallSpeed) *
    difficultyCurve(difficulty);

const spawnRateForDifficulty = (difficulty: Difficulty, config: InvokerConfig) =>
  config.spawn.baseRate +
  (config.spawn.maxRate - config.spawn.baseRate) * spawnCurve(difficulty);

const clampDifficultyState = (
  value: Difficulty,
  config: InvokerConfig
): Difficulty => clampDifficulty(value, config.difficulty);

const applyDifficultyDrift = (
  difficulty: Difficulty,
  dtSeconds: number,
  config: InvokerConfig
) =>
  clampDifficultyState(
    difficulty - config.difficulty.driftPerSecond * dtSeconds,
    config
  );

const applyDifficultyIncrease = (
  difficulty: Difficulty,
  config: InvokerConfig
) =>
  clampDifficultyState(
    difficulty + config.difficulty.completionDelta * (1 - difficulty * 0.25),
    config
  );

const applyDifficultyDrop = (
  difficulty: Difficulty,
  config: InvokerConfig
) => {
  const drop =
    config.difficulty.overCollectionBase +
    config.difficulty.overCollectionScale * difficulty;
  return clampDifficultyState(difficulty - drop, config);
};

const spawnPiece = (
  state: InvokerState,
  config: InvokerConfig,
  dtSeconds: number
): InvokerState => {
  const rate = spawnRateForDifficulty(state.difficulty.value, config);
  let accumulator = state.difficulty.spawnAccumulator + dtSeconds * rate;
  const pieces = [...state.pieces];

  while (accumulator >= 1) {
    accumulator -= 1;
    const trackId = Math.floor(Math.random() * config.tracks) as TrackId;
    const quadrant =
      config.availableQuadrants[
        Math.floor(Math.random() * config.availableQuadrants.length)
      ];
    const color = quadrantColorMap[quadrant];

    const speed = fallSpeedForDifficulty(state.difficulty.value, config);
    pieces.push({
      id: nextPieceId(),
      trackId,
      quadrant,
      color,
      spawnTime: state.time,
      currentY: 0,
      speed: speed * (0.85 + Math.random() * 0.3),
    });
  }

  return {
    ...state,
    pieces,
    difficulty: { ...state.difficulty, spawnAccumulator: accumulator },
  };
};

const updatePieces = (
  state: InvokerState,
  config: InvokerConfig,
  dtSeconds: number
): InvokerState => {
  const pieces = state.pieces
    .map((piece) => ({
      ...piece,
      currentY: piece.currentY + piece.speed * dtSeconds,
    }))
    .filter((piece) => piece.currentY <= config.screenHeight + 50);
  return { ...state, pieces };
};

const markQuadrant = (progress: CircleProgress, quadrant: Quadrant) => ({
  ...progress,
  quadrants: { ...progress.quadrants, [quadrant]: true },
});

const isCircleComplete = (progress: CircleProgress) =>
  Object.values(progress.quadrants).every(Boolean);

const collectPiece = (
  state: InvokerState,
  piece: InvokerPiece,
  config: InvokerConfig
): InvokerState => {
  const targetIndex = state.circleProgress.findIndex(
    (circle) => !circle.quadrants[piece.quadrant]
  );

  // Over-collection: no open quadrants remain for this piece.
  if (targetIndex === -1) {
    const difficulty = applyDifficultyDrop(state.difficulty.value, config);
    const blueGlitch = state.events.blueGlitch || piece.color === "blue";
    return {
      ...state,
      difficulty: { ...state.difficulty, value: difficulty },
      events: { ...state.events, overCollection: true, blueGlitch },
    };
  }

  const updatedCircle = markQuadrant(
    state.circleProgress[targetIndex],
    piece.quadrant
  );
  const circleProgress = [...state.circleProgress];
  circleProgress[targetIndex] = updatedCircle;

  let difficultyValue = state.difficulty.value;
  let score = state.score;
  const completedCircleIds = [...state.events.completedCircleIds];
  let blueGlitch = state.events.blueGlitch;

  if (isCircleComplete(updatedCircle)) {
    score += 10;
    difficultyValue = applyDifficultyIncrease(difficultyValue, config);
    completedCircleIds.push(updatedCircle.id);
    circleProgress.splice(targetIndex, 1);
    circleProgress.push(createCircleProgress());
  }

  return {
    ...state,
    difficulty: { ...state.difficulty, value: difficultyValue },
    circleProgress,
    score,
    events: {
      ...state.events,
      completedCircleIds,
      captured: {
        circleId: updatedCircle.id,
        quadrant: piece.quadrant,
        color: piece.color,
      },
      blueGlitch,
    },
  };
};

export const handleInvokerInput = (
  inputState: InvokerState,
  keyCode: string,
  config: InvokerConfig = defaultInvokerConfig
): InvokerState => {
  const state = withResetEvents(inputState);
  const trackId = trackIdFromKey(keyCode, config);
  if (trackId === null) return state;

  const piecesOnTrack = state.pieces.filter((p) => p.trackId === trackId);
  if (!piecesOnTrack.length) return state;

  const hitCandidate = piecesOnTrack.reduce((closest, piece) => {
    const distance = Math.abs(piece.currentY - config.collectionLineY);
    if (!closest) return piece;
    const closestDistance = Math.abs(
      closest.currentY - config.collectionLineY
    );
    return distance < closestDistance ? piece : closest;
  }, undefined as InvokerPiece | undefined);

  if (!hitCandidate) return state;
  const distance = Math.abs(hitCandidate.currentY - config.collectionLineY);
  if (distance > config.hitWindow) return state;

  const updatedPieces = state.pieces.filter((p) => p.id !== hitCandidate.id);
  const updatedState: InvokerState = { ...state, pieces: updatedPieces };
  return collectPiece(updatedState, hitCandidate, config);
};

export const updateInvokerState = (
  inputState: InvokerState,
  dtMs: number,
  _beatInfo?: unknown,
  config: InvokerConfig = defaultInvokerConfig
): InvokerState => {
  if (inputState.paused) return withResetEvents(inputState);

  const dtSeconds = dtMs / 1000;
  let state: InvokerState = withResetEvents(inputState);
  state = { ...state, time: state.time + dtSeconds };
  state = spawnPiece(state, config, dtSeconds);
  state = updatePieces(state, config, dtSeconds);

  const driftedDifficulty = applyDifficultyDrift(
    state.difficulty.value,
    dtSeconds,
    config
  );
  state = { ...state, difficulty: { ...state.difficulty, value: driftedDifficulty } };
  return state;
};
