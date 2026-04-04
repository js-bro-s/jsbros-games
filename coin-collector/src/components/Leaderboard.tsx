import type { LeaderboardEntry } from "../types/game";
import { GAME_CONFIG } from "../types/game";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentScore: number | null;
}

export function Leaderboard({ entries, currentScore }: LeaderboardProps) {
  if (entries.length === 0) return null;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Leaderboard</h2>
      <div style={styles.list}>
        {entries.map((entry, i) => {
          const isCurrentRun = currentScore !== null && entry.score === currentScore;
          const medals = ["#ffd700", "#c0c0c0", "#cd7f32"];
          return (
            <div
              key={`${entry.name}-${entry.date}-${i}`}
              style={{
                ...styles.row,
                backgroundColor: isCurrentRun ? "rgba(0, 212, 255, 0.15)" : "transparent",
                borderLeft: isCurrentRun ? "3px solid #00d4ff" : "3px solid transparent",
              }}
            >
              <span style={{ ...styles.rank, color: medals[i] ?? "#666" }}>
                {i + 1}.
              </span>
              <span style={styles.name}>{entry.name}</span>
              <span style={styles.score}>{entry.score}</span>
              <span style={styles.date}>{entry.date}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: GAME_CONFIG.CANVAS_WIDTH,
    marginTop: 8,
    padding: "12px 16px",
    background: "rgba(26, 26, 46, 0.95)",
    border: "1px solid #333",
    borderRadius: 8,
    fontFamily: "monospace",
  },
  title: {
    color: "#ffd700",
    fontSize: 16,
    fontWeight: "bold",
    margin: "0 0 8px 0",
    textAlign: "center",
    letterSpacing: 2,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  row: {
    display: "flex",
    alignItems: "center",
    padding: "4px 8px",
    borderRadius: 4,
    gap: 8,
  },
  rank: {
    width: 24,
    fontWeight: "bold",
    fontSize: 14,
  },
  name: {
    flex: 1,
    color: "#ffffff",
    fontSize: 14,
  },
  score: {
    color: "#ffd700",
    fontWeight: "bold",
    fontSize: 14,
    width: 40,
    textAlign: "right",
  },
  date: {
    color: "#555",
    fontSize: 11,
    width: 80,
    textAlign: "right",
  },
};
