import { useEffect, useRef, useState } from "react";
import { InvokerController } from "../game/minigames/invoker/InvokerController";
import { defaultInvokerConfig } from "../game/minigames/invoker/InvokerConfig";

export const InvokerMiniGame = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<InvokerController>();
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState(0);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    controllerRef.current = new InvokerController(containerRef.current, defaultInvokerConfig, {
      onDifficultyChange: setDifficulty,
      onScoreChange: setScore,
      onGameEnd: () => setEnded(true),
    });

    return () => controllerRef.current?.end();
  }, []);

  const startGame = () => {
    setEnded(false);
    controllerRef.current?.start();
  };

  return (
    <div className="invoker-shell">
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <button onClick={startGame}>Start Invoker</button>
        <div>Score: {score}</div>
        <div>Difficulty: {difficulty.toFixed(2)}</div>
        {ended && <div>Game Over</div>}
      </div>
      <div
        ref={containerRef}
        style={{ width: "100%", height: defaultInvokerConfig.screenHeight, minHeight: 400 }}
      />
    </div>
  );
};

export default InvokerMiniGame;
