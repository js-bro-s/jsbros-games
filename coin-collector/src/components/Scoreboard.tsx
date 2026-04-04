import type { GameState } from "../types/game";
import { GAME_CONFIG } from "../types/game";

interface ScoreboardProps {
  state: GameState;
  highScore: number;
}

export function Scoreboard({ state, highScore }: ScoreboardProps) {
  if (state.status === "idle") return null;

  const timePercent = (state.timeLeft / GAME_CONFIG.GAME_DURATION) * 100;
  const isUrgent = state.timeLeft <= 10;

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <div style={styles.stat}>
          <span style={styles.label}>SCORE</span>
          <span style={{ ...styles.value, color: "#ffd700" }}>
            {state.player.score}
          </span>
        </div>
        <div style={styles.stat}>
          <span style={styles.label}>TIME</span>
          <span
            style={{
              ...styles.value,
              color: isUrgent ? "#ff4444" : "#ffffff",
              animation: isUrgent ? "pulse 0.5s infinite alternate" : "none",
            }}
          >
            {state.timeLeft}s
          </span>
        </div>
        <div style={styles.stat}>
          <span style={styles.label}>BEST</span>
          <span style={{ ...styles.value, color: "#00d4ff" }}>
            {Math.max(highScore, state.player.score)}
          </span>
        </div>
      </div>

      {/* Timer bar */}
      <div style={styles.timerBarBg}>
        <div
          style={{
            ...styles.timerBarFill,
            width: `${timePercent}%`,
            backgroundColor: isUrgent ? "#ff4444" : "#00d4ff",
            transition: "width 1s linear, background-color 0.3s",
          }}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: GAME_CONFIG.CANVAS_WIDTH,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: "0 4px",
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  label: {
    fontSize: 10,
    color: "#666",
    letterSpacing: 2,
    fontFamily: "monospace",
  },
  value: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  timerBarBg: {
    width: "100%",
    height: 4,
    backgroundColor: "#222",
    borderRadius: 2,
    overflow: "hidden",
  },
  timerBarFill: {
    height: "100%",
    borderRadius: 2,
  },
};
