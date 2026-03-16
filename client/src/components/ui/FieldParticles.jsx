import { useEffect, useRef } from "react";
import { useStore } from "../../store.js";

const PARTICLE_CONFIGS = {
  swamp: {
    colors: ["#2d5a1e", "#3a7a24", "#1a4a10", "#4a8a3a"],
    count: 18,
    style: "bubble", // rising bubbles
  },
  blood: {
    colors: ["#ff4400", "#cc2200", "#ff6633", "#aa1100"],
    count: 22,
    style: "ember", // floating embers
  },
  frost: {
    colors: ["#a0d8ef", "#ffffff", "#c0e8ff", "#80c0e0"],
    count: 25,
    style: "snow", // falling snowflakes
  },
};

export default function FieldParticles() {
  const theme = useStore((s) => s.theme);
  const animationsOff = useStore((s) => s.animationsOff);
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const rafRef = useRef(null);

  useEffect(() => {
    if (animationsOff) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const config = PARTICLE_CONFIGS[theme] || PARTICLE_CONFIGS.swamp;

    function resize() {
      canvas.width = canvas.parentElement.offsetWidth;
      canvas.height = canvas.parentElement.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // Initialize particles
    particlesRef.current = Array.from({ length: config.count }, () =>
      createParticle(canvas, config),
    );

    function createParticle(cvs, cfg) {
      const p = {
        x: Math.random() * cvs.width,
        y: Math.random() * cvs.height,
        size: 1.5 + Math.random() * 3,
        color: cfg.colors[Math.floor(Math.random() * cfg.colors.length)],
        alpha: 0.15 + Math.random() * 0.35,
        speed: 0.2 + Math.random() * 0.6,
        drift: (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2,
      };
      return p;
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particlesRef.current) {
        if (config.style === "bubble") {
          p.y -= p.speed;
          p.x += Math.sin(p.phase) * 0.3;
          p.phase += 0.01;
          if (p.y < -10) {
            p.y = canvas.height + 10;
            p.x = Math.random() * canvas.width;
          }
        } else if (config.style === "ember") {
          p.y -= p.speed * 0.8;
          p.x += Math.sin(p.phase) * 0.5 + p.drift;
          p.phase += 0.02;
          if (p.y < -10) {
            p.y = canvas.height + 10;
            p.x = Math.random() * canvas.width;
          }
        } else if (config.style === "snow") {
          p.y += p.speed * 0.5;
          p.x += Math.sin(p.phase) * 0.4;
          p.phase += 0.008;
          if (p.y > canvas.height + 10) {
            p.y = -10;
            p.x = Math.random() * canvas.width;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [theme, animationsOff]);

  if (animationsOff) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
}
