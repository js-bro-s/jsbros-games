import { useEffect, useRef } from "react";
import type { GameState } from "../types/game";
import { COIN_TIERS, GAME_CONFIG } from "../types/game";

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

    // Draw coins (tier-colored)
    for (const coin of state.coins) {
      if (coin.collected) continue;
      const tierCfg = COIN_TIERS[coin.tier];

      // Glow
      ctx.shadowColor = tierCfg.glowColor;
      ctx.shadowBlur = coin.tier === "gold" ? 16 : 10;

      ctx.beginPath();
      ctx.arc(coin.position.x, coin.position.y, coin.radius, 0, Math.PI * 2);
      ctx.fillStyle = tierCfg.color;
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
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.fill();

      // Point label
      ctx.fillStyle = tierCfg.innerColor;
      ctx.font = `bold ${Math.max(coin.radius - 2, 8)}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tierCfg.label, coin.position.x, coin.position.y + 1);
    }

    // Draw power-ups
    const now = Date.now();
    for (const pu of state.powerUps) {
      if (pu.collected) continue;

      const isMagnet = pu.type === "magnet";
      const lifeLeft = 1 - (now - pu.spawnedAt) / GAME_CONFIG.POWERUP_LIFETIME;
      const pulse = 1 + Math.sin(now * 0.008) * 0.15;
      const drawRadius = pu.radius * pulse;

      // Glow
      ctx.shadowColor = isMagnet ? "#ff44ff" : "#00ff88";
      ctx.shadowBlur = 20;

      // Outer ring
      ctx.beginPath();
      ctx.arc(pu.position.x, pu.position.y, drawRadius, 0, Math.PI * 2);
      ctx.fillStyle = isMagnet
        ? `rgba(255, 68, 255, ${0.3 + lifeLeft * 0.5})`
        : `rgba(0, 255, 136, ${0.3 + lifeLeft * 0.5})`;
      ctx.fill();

      // Inner icon
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${pu.radius}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(isMagnet ? "@" : ">>", pu.position.x, pu.position.y + 1);
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
    const hasSpeed = player.boosts.some((b) => b.type === "speed");
    const hasMagnet = player.boosts.some((b) => b.type === "magnet");
    const isBoosted = hasSpeed || hasMagnet;

    // Magnet range indicator
    if (hasMagnet) {
      const magnetAlpha = 0.08 + Math.sin(now * 0.005) * 0.04;
      ctx.beginPath();
      ctx.arc(player.position.x, player.position.y, GAME_CONFIG.MAGNET_RANGE, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 68, 255, ${magnetAlpha})`;
      ctx.fill();

      // Magnet ring
      ctx.beginPath();
      ctx.arc(player.position.x, player.position.y, GAME_CONFIG.MAGNET_RANGE, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 68, 255, ${0.25 + Math.sin(now * 0.008) * 0.15})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -now * 0.03;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Speed boost aura
    if (hasSpeed) {
      ctx.shadowColor = "#00ff88";
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(player.position.x, player.position.y, player.radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 136, ${0.4 + Math.sin(now * 0.01) * 0.3})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Magnet inner ring
    if (hasMagnet) {
      ctx.shadowColor = "#ff44ff";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(player.position.x, player.position.y, player.radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 68, 255, ${0.5 + Math.sin(now * 0.012) * 0.3})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Player color priority: both > magnet > speed > default
    const playerColor = hasMagnet && hasSpeed ? "#88ff88" : hasMagnet ? "#ff88ff" : hasSpeed ? "#00ff88" : "#00d4ff";
    const glowColor = hasMagnet ? "#ff44ff" : hasSpeed ? "#00ff88" : "#00d4ff";

    // Player glow
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 16;

    ctx.beginPath();
    ctx.arc(player.position.x, player.position.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = playerColor;
    ctx.fill();

    ctx.shadowBlur = 0;

    // Player face
    const faceColor = hasMagnet && hasSpeed ? "#225522" : hasMagnet ? "#660066" : hasSpeed ? "#006633" : "#0a4f6e";
    const face = isBoosted ? ":D" : ":)";
    ctx.fillStyle = faceColor;
    ctx.font = `bold ${player.radius}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(face, player.position.x, player.position.y + 1);

    // HUD - Score
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, CANVAS_WIDTH, 36);

    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`Score: ${player.score}`, 12, 8);

    // HUD - Difficulty
    const diffColors: Record<string, string> = {
      Easy: "#44ff44",
      Medium: "#ffdd44",
      Hard: "#ff8844",
      Expert: "#ff4444",
      Legendary: "#ff44ff",
    };
    ctx.fillStyle = diffColors[state.difficulty.label] ?? "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(state.difficulty.label, CANVAS_WIDTH / 2, 8);

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
