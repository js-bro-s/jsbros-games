import { useEffect, useRef } from "react";
import type { GameState } from "../types/game";
import { GAME_CONFIG } from "../types/game";

interface GameCanvasProps {
  state: GameState;
}

export function GameCanvas({ state }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { CANVAS_WIDTH, CANVAS_HEIGHT } = GAME_CONFIG;

    // Clear
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    ctx.strokeStyle = "#16213e";
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Draw coins
    for (const coin of state.coins) {
      if (coin.collected) continue;

      // Glow
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.arc(coin.position.x, coin.position.y, coin.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd700";
      ctx.fill();

      // Inner shine
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(
        coin.position.x - coin.radius * 0.25,
        coin.position.y - coin.radius * 0.25,
        coin.radius * 0.4,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fill();

      // Dollar sign
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#b8860b";
      ctx.font = `bold ${coin.radius}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", coin.position.x, coin.position.y + 1);
    }

    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw particle effects
    for (const fx of state.effects) {
      for (const p of fx.particles) {
        if (p.life <= 0) continue;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Draw player
    const { player } = state;

    // Player glow
    ctx.shadowColor = "#00d4ff";
    ctx.shadowBlur = 16;

    ctx.beginPath();
    ctx.arc(player.position.x, player.position.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#00d4ff";
    ctx.fill();

    ctx.shadowBlur = 0;

    // Player face
    ctx.fillStyle = "#0a4f6e";
    ctx.font = `bold ${player.radius}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(":)", player.position.x, player.position.y + 1);

    // HUD - Score
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, CANVAS_WIDTH, 36);

    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`Coins: ${player.score}`, 12, 8);

    // HUD - Timer
    const timerColor = state.timeLeft <= 10 ? "#ff4444" : "#ffffff";
    ctx.fillStyle = timerColor;
    ctx.textAlign = "right";
    ctx.fillText(`Time: ${state.timeLeft}s`, CANVAS_WIDTH - 12, 8);

    // Game over overlay
    if (state.status === "ended") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 36px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Time's Up!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px monospace";
      ctx.fillText(
        `Final Score: ${player.score} coins`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 10
      );

      ctx.fillStyle = "#aaaaaa";
      ctx.font = "16px monospace";
      ctx.fillText("Press SPACE to play again", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
    }

    // Idle screen
    if (state.status === "idle") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 32px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Coin Collector", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

      ctx.fillStyle = "#ffffff";
      ctx.font = "18px monospace";
      ctx.fillText("WASD or Arrow Keys to move", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);

      ctx.fillStyle = "#00d4ff";
      ctx.font = "bold 20px monospace";
      ctx.fillText("Press SPACE to start", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
    }
  }, [state]);

  return (
    <canvas
      ref={canvasRef}
      width={GAME_CONFIG.CANVAS_WIDTH}
      height={GAME_CONFIG.CANVAS_HEIGHT}
      style={{
        border: "2px solid #333",
        borderRadius: "8px",
        display: "block",
      }}
    />
  );
}
