import { describe, expect, it } from "vitest";
import { defaultInvokerConfig } from "../InvokerConfig";
import {
  createInitialInvokerState,
  handleInvokerInput,
  updateInvokerState,
} from "../InvokerLogic";

const testConfig = {
  ...defaultInvokerConfig,
  spawn: { ...defaultInvokerConfig.spawn, baseRate: 0, maxRate: 0 },
};

describe("InvokerLogic", () => {
  it("fills quadrants on hit", () => {
    let state = createInitialInvokerState(testConfig);
    state = { ...state, paused: false };
    const piece = {
      id: "p1",
      trackId: 0,
      quadrant: "upperLeft" as const,
      color: "red" as const,
      spawnTime: 0,
      currentY: testConfig.collectionLineY,
      speed: 0,
    };
    state = { ...state, pieces: [piece] };
    const updated = handleInvokerInput(state, "KeyA", testConfig);
    expect(updated.circleProgress.red.quadrants.upperLeft).toBe(true);
    expect(updated.pieces.length).toBe(0);
  });

  it("completing circle increases difficulty and score", () => {
    let state = createInitialInvokerState(testConfig);
    state = { ...state, paused: false };
    const baseDifficulty = state.difficulty.value;
    const pieces = [
      "upperLeft",
      "upperRight",
      "lowerLeft",
      "lowerRight",
    ].map((quadrant, idx) => ({
      id: `p${idx}`,
      trackId: 0 as const,
      quadrant: quadrant as typeof state.circleProgress.red.quadrants extends Record<infer Q, boolean> ? Q : never,
      color: "red" as const,
      spawnTime: 0,
      currentY: testConfig.collectionLineY,
      speed: 0,
    }));
    state = { ...state, pieces };
    let updated = state;
    pieces.forEach(() => {
      updated = handleInvokerInput(updated, "KeyA", testConfig);
    });
    expect(updated.score).toBe(10);
    expect(updated.difficulty.value).toBeGreaterThan(baseDifficulty);
  });

  it("drops difficulty on over-collection", () => {
    let state = createInitialInvokerState(testConfig);
    state = { ...state, paused: false };
    const filled = {
      ...state.circleProgress.red,
      quadrants: {
        upperLeft: true,
        upperRight: true,
        lowerLeft: true,
        lowerRight: true,
      },
    };
    state = { ...state, circleProgress: { ...state.circleProgress, red: filled } };
    const piece = {
      id: "p1",
      trackId: 0,
      quadrant: "upperLeft" as const,
      color: "red" as const,
      spawnTime: 0,
      currentY: testConfig.collectionLineY,
      speed: 0,
    };
    state = { ...state, pieces: [piece] };
    const updated = handleInvokerInput(state, "KeyA", testConfig);
    expect(updated.difficulty.value).toBeLessThan(state.difficulty.value);
    expect(updated.events.overCollection).toBe(true);
  });

  it("applies drift over time", () => {
    let state = createInitialInvokerState(testConfig);
    state = { ...state, paused: false, difficulty: { ...state.difficulty, value: 0.6 } };
    const updated = updateInvokerState(state, 1000, undefined, testConfig);
    expect(updated.difficulty.value).toBeLessThan(0.6);
  });
});
