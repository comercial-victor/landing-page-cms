"use client";
import { useRef, useEffect, useState } from "react";

interface VideoRevealProps {
  videoSrc?: string;
  title?: string;
  subtitle?: string;
}

export default function VideoReveal({
  videoSrc,
  title = "Comercial Victor",
  subtitle = "Todo para que tu fiesta brille",
}: VideoRevealProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const windowH = window.innerHeight;
      // Start animation when section enters viewport, complete when it's fully in view
      const start = windowH; // rect.top starts here
      const end = -rect.height * 0.3;
      const raw = 1 - (rect.top - end) / (start - end);
      setProgress(Math.max(0, Math.min(1, raw)));
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Text reveal: letters clip from bottom
  const clipY = Math.max(0, 100 - progress * 200); // Reveals fast
  const textOpacity = Math.min(1, progress * 2.5);
  const scale = 1 + (1 - Math.min(1, progress * 2)) * 0.15;
  const subtitleOpacity = Math.max(0, (progress - 0.4) * 3);
  const videoOpacity = Math.max(0.3, Math.min(0.6, progress));

  return (
    <section className="video-reveal" ref={sectionRef}>
      {/* Video background */}
      <div className="vr-video-wrap" style={{ opacity: videoOpacity }}>
        {videoSrc ? (
          <video autoPlay muted loop playsInline className="vr-video" preload="metadata">
            <source src={videoSrc} type="video/mp4" />
          </video>
        ) : (
          <div className="vr-placeholder" />
        )}
      </div>

      {/* Dark overlay */}
      <div className="vr-overlay" />

      {/* Text content */}
      <div className="vr-content">
        <h2
          className="vr-title serif"
          style={{
            clipPath: `inset(0 0 ${clipY}% 0)`,
            opacity: textOpacity,
            transform: `scale(${scale})`,
          }}
        >
          {title}
        </h2>
        <p
          className="vr-subtitle"
          style={{ opacity: subtitleOpacity, transform: `translateY(${(1 - subtitleOpacity) * 20}px)` }}
        >
          {subtitle}
        </p>
      </div>
    </section>
  );
}
