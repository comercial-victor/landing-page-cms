"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

type ConfettiPiece = {
  id: number;
  left: number;
  delay: number;
  dur: number;
  drift: number;
  color: string;
  shape: string;
  size: number;
};

type BalloonPiece = {
  id: number;
  left: number;
  drift: number;
  delay: number;
  dur: number;
  scale: number;
  color: string;
};

type BackgroundDecorProps = {
  launchBalloons?: boolean;
};

export default function BackgroundDecor({ launchBalloons = false }: BackgroundDecorProps) {
  // Click burst effect
  useEffect(() => {
    const palette = ["#D2386C", "#FF7A59", "#FFD23F", "#3DD6B5", "#8B5CF6", "#4BA3FF"];
    const onClick = (e: MouseEvent) => {
      const tag = ((e.target as HTMLElement)?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      const x = e.clientX, y = e.clientY;
      for (let i = 0; i < 14; i++) {
        const piece = document.createElement("span");
        piece.className = "burst-piece";
        const color = palette[Math.floor(Math.random() * palette.length)];
        piece.style.background = color;
        piece.style.left = x + "px";
        piece.style.top = y + "px";
        const angle = (Math.PI * 2 * i) / 14 + (Math.random() - 0.5) * 0.6;
        const dist = 50 + Math.random() * 90;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist - 20;
        const rot = (Math.random() - 0.5) * 720;
        const dur = 600 + Math.random() * 400;
        piece.style.transform = "translate(-50%, -50%) rotate(0deg)";
        piece.style.opacity = "1";
        document.body.appendChild(piece);
        requestAnimationFrame(() => {
          piece.style.transition = `transform ${dur}ms cubic-bezier(.2,.7,.3,1), opacity ${dur}ms ease-out`;
          piece.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 80}px)) rotate(${rot}deg)`;
          piece.style.opacity = "0";
        });
        setTimeout(() => piece.remove(), dur + 50);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const [mounted, setMounted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [balloons, setBalloons] = useState<BalloonPiece[]>([]);

  useEffect(() => {
    setMounted(true);
    const palette = ["#D2386C", "#FF7A59", "#FFD23F", "#3DD6B5", "#8B5CF6", "#4BA3FF"];
    const shapes = ["pica-rect", "pica-circle", "pica-squiggle", "pica-triangle"];
    const pieces = Array.from({ length: 45 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: -Math.random() * 18,
      dur: 10 + Math.random() * 14,
      drift: (Math.random() - 0.5) * 140,
      color: palette[i % palette.length],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      size: 0.7 + Math.random() * 0.8,
    }));
    setConfetti(pieces);
  }, []);

  useEffect(() => {
    const update = () => {
      const heroLimit = Math.min(window.innerHeight * 0.78, 720);
      setShowConfetti(window.scrollY > heroLimit);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    if (!launchBalloons) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const palette = ["#F26F55", "#F3C84D", "#BD2F61", "#26B99D", "#7C6CE4", "#FF9DB4"];
    const launch = window.setTimeout(() => {
      setBalloons(Array.from({ length: 16 }, (_, i) => ({
        id: i,
        left: 4 + Math.random() * 92,
        drift: (Math.random() - 0.5) * 180,
        delay: Math.random() * 0.35,
        dur: 2.55 + Math.random() * 0.55,
        scale: 0.72 + Math.random() * 0.62,
        color: palette[i % palette.length],
      })));
    }, 260);

    const cleanup = window.setTimeout(() => setBalloons([]), 4200);
    return () => {
      window.clearTimeout(launch);
      window.clearTimeout(cleanup);
    };
  }, [launchBalloons]);

  if (!mounted) return null;

  return (
    <>
      <div className="bg-decor" aria-hidden="true">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="grain" />
      </div>
      {showConfetti && (
        <div className="confetti-layer" aria-hidden="true">
          {confetti.map((p) => (
            <span
              key={p.id}
              className={`pica ${p.shape}`}
              style={{
                left: p.left + "%",
                background: p.shape === "pica-triangle" ? "transparent" : p.color,
                color: p.color,
                animationDelay: p.delay + "s",
                animationDuration: p.dur + "s",
                transform: `scale(${p.size})`,
                ["--drift" as string]: p.drift + "px",
              }}
            />
          ))}
        </div>
      )}
      {balloons.length > 0 && (
        <div className="balloon-launch-layer" aria-hidden="true">
          {balloons.map((balloon) => (
            <span
              key={balloon.id}
              className="load-balloon"
              style={{
                left: `${balloon.left}%`,
                "--balloon-color": balloon.color,
                "--balloon-drift": `${balloon.drift}px`,
                "--balloon-delay": `${balloon.delay}s`,
                "--balloon-duration": `${balloon.dur}s`,
                "--balloon-scale": balloon.scale,
              } as CSSProperties}
            />
          ))}
        </div>
      )}
    </>
  );
}
