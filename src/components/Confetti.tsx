"use client";

import { useEffect, useRef } from "react";

// Nobox-palet: groen, paars, geel + ink/wit accenten.
const COLORS = ["#E6FB7C", "#D2BBFF", "#FFE066", "#1A1A1A", "#FFFFFF"];
const PIECES = 140;
const DURATION_MS = 3800;

type Piece = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  delay: number;
};

/**
 * Eenmalige confetti-burst bij het laden van de success-pagina.
 * Puur canvas, geen dependencies; respecteert prefers-reduced-motion.
 * Later vervangen/aangevuld met een Nobox-GIF zodra Sebas die aanlevert.
 */
export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    const pieces: Piece[] = Array.from({ length: PIECES }, () => ({
      x: rand(0, canvas.width),
      y: rand(-canvas.height * 0.3, -20 * dpr),
      w: rand(6, 12) * dpr,
      h: rand(8, 16) * dpr,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vx: rand(-0.6, 0.6) * dpr,
      vy: rand(2, 4.5) * dpr,
      rot: rand(0, Math.PI * 2),
      vrot: rand(-0.12, 0.12),
      delay: rand(0, 600),
    }));

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Laatste seconde uitfaden zodat het netjes verdwijnt.
      const fade = Math.max(0, Math.min(1, (DURATION_MS - elapsed) / 1000));
      ctx.globalAlpha = fade;
      for (const p of pieces) {
        if (elapsed < p.delay) continue;
        p.x += p.vx + Math.sin((elapsed + p.delay) / 350) * 0.8 * dpr;
        p.y += p.vy;
        p.rot += p.vrot;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (elapsed < DURATION_MS) {
        raf = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 w-full h-full"
    />
  );
}
