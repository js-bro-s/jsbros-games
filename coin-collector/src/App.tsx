import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas } from "./components/GameCanvas";
import { Scoreboard } from "./components/Scoreboard";
import { useGame } from "./hooks/useGame";
import { useSound } from "./hooks/useSound";
import "./App.css";

function App() {
  const [highScore, setHighScore] = useState(0);
  const sound = useSound();
  const prevStatusRef = useRef<string>("idle");

  const onCollect = useCallback(() => sound.playCollect(), [sound]);
  const onCountdown = useCallback(() => sound.playCountdown(), [sound]);
  const onGameOver = useCallback(() => sound.playGameOver(), [sound]);

  const { state, start, restart } = useGame({ onCollect, onCountdown, onGameOver });

  // Track high score and play start sound
  useEffect(() => {
    if (state.status === "ended" && state.player.score > highScore) {
      setHighScore(state.player.score);
    }
    if (state.status === "playing" && prevStatusRef.current !== "playing") {
      sound.playStart();
    }
    prevStatusRef.current = state.status;
  }, [state.status, state.player.score, highScore, sound]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      if (state.status === "idle") start();
      if (state.status === "ended") restart();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.status, start, restart]);

  return (
    <div className="app">
      <h1 className="title">
        <span className="coin-icon">$</span> Coin Collector
      </h1>
      <Scoreboard state={state} highScore={highScore} />
      <GameCanvas state={state} />
      <p className="hint">
        {state.status === "playing"
          ? "Collect as many coins as you can before time runs out!"
          : "A JS Bros Lab game — Lesson 09"}
      </p>
    </div>
  );
}

export default App;
