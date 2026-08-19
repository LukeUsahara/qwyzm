import { useEffect, useState } from "react";
import type { GameEngine, GameView } from "@qwyzm/game-core";

export function useGameView(engine: GameEngine | null): GameView | null {
  const [view, setView] = useState<GameView | null>(null);

  useEffect(() => {
    if (engine === null) {
      setView(null);
      return;
    }

    let frame = 0;
    const loop = () => {
      setView(engine.getView());
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [engine]);

  return view;
}
