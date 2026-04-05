import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas } from "./components/GameCanvas";
import { Leaderboard } from "./components/Leaderboard";
import { Scoreboard } from "./components/Scoreboard";
import { useGame } from "./hooks/useGame";
import { useLeaderboard } from "./hooks/useLeaderboard";
import { useSound } from "./hooks/useSound";
import "./App.css";

function App() {
  const [highScore, setHighScore] = useState(0);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [showNameInput, setShowNameInput] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const sound = useSound();
  const prevStatusRef = useRef<string>("idle");
  const { entries, addEntry, isHighScore } = useLeaderboard();

  const onCollect = useCallback(() => sound.playCollect(), [sound]);
  const onSpeedUp = useCallback(() => sound.playPowerUp(), [sound]);
  const onMagnet = useCallback(() => sound.playMagnet(), [sound]);
  const onCountdown = useCallback(() => sound.playCountdown(), [sound]);
  const onGameOver = useCallback(() => sound.playGameOver(), [sound]);
  const onJump = useCallback(() => sound.playCollect(), [sound]);
  const onStomp = useCallback(() => sound.playPowerUp(), [sound]);
  const onHurt = useCallback(() => sound.playCountdown(), [sound]);

  const { state, start, restart } = useGame({ onCollect, onSpeedUp, onMagnet, onCountdown, onGameOver, onJump, onStomp, onHurt });

  // Handle game state transitions
  useEffect(() => {
    if (state.status === "ended" && prevStatusRef.current === "playing") {
      const score = state.player.score;
      if (score > highScore) setHighScore(score);

      if (isHighScore(score)) {
        setShowNameInput(true);
        setLastScore(score);
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        setLastScore(score);
      }
    }
    if (state.status === "playing" && prevStatusRef.current !== "playing") {
      sound.playStart();
      setShowNameInput(false);
      setLastScore(null);
    }
    prevStatusRef.current = state.status;
  }, [state.status, state.player.score, highScore, sound, isHighScore]);

  const handleSubmitName = useCallback(() => {
    const name = playerName.trim() || "Player";
    if (lastScore !== null) {
      addEntry(name, lastScore);
      setShowNameInput(false);
      setPlayerName("");
    }
  }, [playerName, lastScore, addEntry]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showNameInput) {
        if (e.code === "Enter") {
          e.preventDefault();
          handleSubmitName();
        }
        return;
      }
      // Space starts/restarts only when not playing (during play it's jump via useKeyboard)
      if (e.code === "Space" && state.status !== "playing") {
        e.preventDefault();
        if (state.status === "idle") start();
        if (state.status === "ended") restart();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.status, start, restart, showNameInput, handleSubmitName]);

  return (
    <div className="app">
      <h1 className="title">
        <span className="coin-icon">$</span> Coin Collector
      </h1>
      <Scoreboard state={state} highScore={highScore} />
      <GameCanvas state={state} />

      {/* Name input for high score */}
      {showNameInput && (
        <div className="name-input-container">
          <p className="new-high-score">New High Score!</p>
          <div className="name-input-row">
            <input
              ref={inputRef}
              type="text"
              className="name-input"
              placeholder="Enter your name"
              maxLength={16}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            <button className="name-submit" onClick={handleSubmitName}>
              Save
            </button>
          </div>
        </div>
      )}

      <p className="hint">
        {state.status === "playing"
          ? "Coins: 1/3/5  |  >> Speed  @ Magnet  |  SPACE jump  |  Stomp goombas!"
          : "A JS Bros Lab game — Lesson 09"}
      </p>

      <Leaderboard entries={entries} currentScore={lastScore} />
    </div>
  );
}

export default App;
