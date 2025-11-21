import React, { useEffect, useRef, useState } from "react";
import { InvokerController } from "./InvokerController";
import { defaultInvokerConfig } from "./InvokerConfig";

export const Invoker: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<InvokerController | null>(null);

  const [started, setStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState(0);

  // Create the controller once, when the container is available
  useEffect(() => {
    if (!containerRef.current) return;

    // Only create once
    if (controllerRef.current) return;

    const controller = new InvokerController(containerRef.current, defaultInvokerConfig, {
      onGameEnd: () => {
        setStarted(false);
        // you can add additional cleanup or UI here
      },
      onDifficultyChange: (value: number) => {
        setDifficulty(value);
      },
      onScoreChange: (value: number) => {
        setScore(value);
      },
    });

    controllerRef.current = controller;

    // Cleanup on unmount
    return () => {
      controllerRef.current?.end();
      controllerRef.current = null;
    };
  }, []);

  const handleStart = () => {
    if (!controllerRef.current) return;
    controllerRef.current.start();
    setStarted(true);
  };

  const handleEnd = () => {
    controllerRef.current?.end();
    controllerRef.current = null;
    setStarted(false);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        padding: "1rem",
        background: "#050814",
        borderRadius: "0.75rem",
        border: "1px solid #1f2933",
      }}
    >
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <button onClick={handleStart} disabled={started}>
          Start Invoker
        </button>
        <button onClick={handleEnd} disabled={!started}>
          End Invoker
        </button>

        <div style={{ marginLeft: "auto", display: "flex", gap: "1rem" }}>
          <span>Score: {score}</span>
          <span>Difficulty: {difficulty.toFixed(2)}</span>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          // these can come from defaultInvokerConfig if you’d like
          width: defaultInvokerConfig.tracks * 140,
          height: defaultInvokerConfig.screenHeight,
          // let Phaser own the background, but this guards layout
          overflow: "hidden",
        }}
      />
    </div>
  );
};
