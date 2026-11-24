import type { PatternId } from "@/shared/types";

export interface PatternPalette {
  ink: string;
  accent: string;
}

export const DEFAULT_PALETTE: PatternPalette = {
  ink: "#2b1d10",
  accent: "#8f4a2a",
};

export const PATTERN_NAMES: Record<PatternId, string> = {
  blank: "素面",
  ring: "回心",
  wave: "水波",
  leaf: "叶脉",
  star: "星芒",
  spiral: "螺纹",
  moon: "月牙",
};

/**
 * Paint a face motif on a transparent square of side `size`. The motif's own
 * north points to the top of the square; callers rotate the canvas to align it
 * with the face's printed orientation.
 */
export function paintPattern(
  ctx: CanvasRenderingContext2D,
  pattern: PatternId,
  size: number,
  palette: PatternPalette = DEFAULT_PALETTE,
): void {
  const c = size / 2;
  const r = size * 0.31;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = palette.ink;
  ctx.fillStyle = palette.ink;
  ctx.lineWidth = Math.max(1.2, size * 0.045);
  if (pattern === "blank") {
    ctx.restore();
    return;
  }
  if (pattern === "ring") {
    for (const factor of [1, 0.63, 0.3]) {
      ctx.beginPath();
      ctx.arc(c, c, r * factor, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.moveTo(c, c - r * 1.24);
    ctx.lineTo(c + size * 0.065, c - r * 1.48);
    ctx.lineTo(c - size * 0.065, c - r * 1.48);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }
  if (pattern === "wave") {
    ctx.beginPath();
    for (let line = -1; line <= 1; line += 1) {
      const y = c + line * r * 0.62;
      ctx.moveTo(c - r, y);
      ctx.bezierCurveTo(c - r / 2, y - r * 0.55, c, y + r * 0.55, c + r, y);
    }
    ctx.stroke();
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.arc(c + r * 0.85, c - r * 0.95, size * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (pattern === "leaf") {
    ctx.beginPath();
    ctx.moveTo(c, c - r);
    ctx.bezierCurveTo(c + r * 0.95, c - r * 0.3, c + r * 0.65, c + r * 0.75, c, c + r * 0.95);
    ctx.bezierCurveTo(c - r * 0.65, c + r * 0.75, c - r * 0.95, c - r * 0.3, c, c - r);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(c, c - r * 0.8);
    ctx.lineTo(c, c + r * 1.18);
    ctx.stroke();
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.arc(c - r * 0.68, c - r * 0.25, size * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (pattern === "star") {
    ctx.beginPath();
    for (let point = 0; point < 10; point += 1) {
      const angle = -Math.PI / 2 + (point * Math.PI) / 5;
      const radius = point % 2 === 0 ? r : r * 0.42;
      const x = c + Math.cos(angle) * radius;
      const y = c + Math.sin(angle) * radius;
      if (point === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.arc(c + r * 1.03, c + r * 0.38, size * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (pattern === "spiral") {
    ctx.beginPath();
    for (let step = 0; step <= 64; step += 1) {
      const t = step / 64;
      const angle = t * Math.PI * 4 - Math.PI / 2;
      const radius = r * (0.15 + t * 0.9);
      const x = c + Math.cos(angle) * radius;
      const y = c + Math.sin(angle) * radius;
      if (step === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.arc(c + r * 0.9, c - r * 0.6, size * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  // moon: crescent opening east with a small notch to the north
  ctx.beginPath();
  ctx.arc(c, c, r, Math.PI * 0.42, Math.PI * 1.58);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c + r * 0.34, c, r * 0.82, Math.PI * 0.3, Math.PI * 1.7, true);
  ctx.stroke();
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(c - r * 0.08, c - r * 0.86, size * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Draw a motif with its printed north rotated to `angle` radians. */
export function paintPatternRotated(
  ctx: CanvasRenderingContext2D,
  pattern: PatternId,
  centerX: number,
  centerY: number,
  size: number,
  angle: number,
  palette: PatternPalette = DEFAULT_PALETTE,
): void {
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angle);
  ctx.translate(-size / 2, -size / 2);
  paintPattern(ctx, pattern, size, palette);
  ctx.restore();
}

export function sealMark(
  ctx: CanvasRenderingContext2D,
  color: string,
  width: number,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, width * 0.16);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(width * 0.1, width * 0.5);
  ctx.lineTo(width * 0.9, width * 0.5);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(width * 0.5, width * 0.5, width * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
