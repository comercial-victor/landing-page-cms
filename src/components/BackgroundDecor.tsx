"use client";

import { useEffect, useState } from "react";

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

export default function BackgroundDecor() {
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

  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
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

  return (
    <>
      <div className="bg-decor" aria-hidden="true">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="grain" />
      </div>
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
    </>
  );
}
