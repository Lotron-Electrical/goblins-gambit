import { useEffect, useRef } from "react";
import { useStore } from "../../store.js";

const PARTICLE_COUNT = 40;
const COLORS = [
  "rgba(212, 160, 23, 0.6)", // gold
  "rgba(212, 160, 23, 0.3)", // dim gold
  "rgba(180, 220, 255, 0.4)", // pale blue
  "rgba(255, 255, 255, 0.3)", // white
  "rgba(160, 200, 120, 0.3)", // swamp green
];

export default function SparkleParticles() {
  const animationsOff = useStore((s) => s.animationsOff);
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const rafRef = useRef(null);

  useEffect(() => {
    if (animationsOff) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize particles
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
      createParticle(canvas),
    );

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particlesRef.current) {
        // Drift
        p.x += p.vx + Math.sin(p.wobblePhase) * p.wobbleAmp;
        p.y += p.vy;
        p.wobblePhase += p.wobbleSpeed;
        p.life -= p.decay;
        p.twinkle += p.twinkleSpeed;

        // Fade based on life + twinkle
        const lifeFade =
          Math.min(1, p.life * 3) * Math.min(1, (1 - p.life) * 5);
        const twinkle = 0.5 + 0.5 * Math.sin(p.twinkle);
        const alpha = lifeFade * twinkle * p.baseAlpha;

        if (alpha > 0.01) {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();

          if (p.shape === "circle") {
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // 4-pointed star
            drawStar(ctx, p.x, p.y, p.size);
          }

          // Soft glow
          ctx.globalAlpha = alpha * 0.3;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = p.size * 4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }

        // Respawn when dead or off-screen
        if (
          p.life <= 0 ||
          p.y > canvas.height + 10 ||
          p.x < -10 ||
          p.x > canvas.width + 10
        ) {
          Object.assign(p, createParticle(canvas));
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animationsOff]);

  if (animationsOff) return null;

  return (
    <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />
  );
}

function createParticle(canvas) {
  return {
    x: Math.random() * canvas.width,
    y: -10 + Math.random() * canvas.height * 0.3,
    vx: (Math.random() - 0.5) * 0.3,
    vy: 0.2 + Math.random() * 0.5,
    size: 1 + Math.random() * 2.5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    baseAlpha: 0.3 + Math.random() * 0.7,
    life: 1,
    decay: 0.001 + Math.random() * 0.003,
    wobblePhase: Math.random() * Math.PI * 2,
    wobbleAmp: 0.2 + Math.random() * 0.5,
    wobbleSpeed: 0.01 + Math.random() * 0.02,
    twinkle: Math.random() * Math.PI * 2,
    twinkleSpeed: 0.03 + Math.random() * 0.06,
    shape: Math.random() > 0.6 ? "star" : "circle",
  };
}

function drawStar(ctx, x, y, size) {
  const spikes = 4;
  const outerR = size;
  const innerR = size * 0.35;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}
