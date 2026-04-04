import { useCallback, useEffect, useState } from "react";
import type { LeaderboardEntry } from "../types/game";

const STORAGE_KEY = "coin-collector-leaderboard";
const MAX_ENTRIES = 10;

function loadEntries(): LeaderboardEntry[] {
  try {
    const raw = window.__leaderboard;
    if (raw) return raw;
  } catch {
    // ignore
  }
  return [];
}

function saveEntries(entries: LeaderboardEntry[]) {
  window.__leaderboard = entries;
}

// Extend window to hold leaderboard in memory (no localStorage in some envs)
declare global {
  interface Window {
    __leaderboard?: LeaderboardEntry[];
  }
}

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(loadEntries);

  // Sync on mount
  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  const addEntry = useCallback(
    (name: string, score: number) => {
      const entry: LeaderboardEntry = {
        name,
        score,
        date: new Date().toISOString().split("T")[0],
      };
      const updated = [...entries, entry]
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_ENTRIES);
      saveEntries(updated);
      setEntries(updated);
      return updated;
    },
    [entries]
  );

  const isHighScore = useCallback(
    (score: number) => {
      if (score <= 0) return false;
      if (entries.length < MAX_ENTRIES) return true;
      return score > entries[entries.length - 1].score;
    },
    [entries]
  );

  return { entries, addEntry, isHighScore };
}
