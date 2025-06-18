// ParticleBackground.tsx
"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils"; // Optional: Utility for merging classNames (common in Shadcn/UI setups)

const NUM_PARTICLES = 50;
const MAX_DISTANCE = 150;

interface ParticleBackgroundProps {
  className?: string;
  theme?: "light" | "dark"; // Optional: For theme-aware particle colors
}

const ParticleBackground = ({ className, theme }: ParticleBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<
    { x: number; y: number; dx: number; dy: number }[]
  >([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const resize = () => {
      // Resize to parent container’s dimensions
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
      }
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize particles
    particlesRef.current = Array.from({ length: NUM_PARTICLES }, () => ({
      x: Math.random() * (canvas.width || 0),
      y: Math.random() * (canvas.height || 0),
      dx: (Math.random() - 0.5) * 0.5,
      dy: (Math.random() - 0.5) * 0.5,
    }));

    const animateParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Move and draw particles
      for (const p of particlesRef.current) {
        p.x += p.dx;
        p.y += p.dy;

        // Bounce off edges
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        // Theme-aware particle color
        ctx.fillStyle =
          theme === "dark"
            ? "rgba(200, 200, 200, 0.7)" // Dimmer for dark mode
            : "rgba(255, 255, 255, 0.7)"; // Brighter for light mode
        ctx.fill();
      }

      // Draw lines
      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const a = particlesRef.current[i];
          const b = particlesRef.current[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < MAX_DISTANCE) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(${
              theme === "dark" ? "200, 200, 200" : "255, 255, 255"
            }, ${1 - dist / MAX_DISTANCE})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(animateParticles);
    };

    animateParticles();
    return () => window.removeEventListener("resize", resize);
  }, [theme]); // Re-run effect if theme changes

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0", className)} // Merge default and custom classes
    />
  );
};

export default ParticleBackground;
