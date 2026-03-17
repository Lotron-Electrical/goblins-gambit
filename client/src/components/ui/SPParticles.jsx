import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Gold particle burst when SP is gained.
 * Spawns particles that arc upward toward the SP counter area.
 */
export default function SPParticles({ spEvents }) {
  return (
    <AnimatePresence>
      {spEvents.map((evt) => (
        <ParticleBurst key={evt.id} x={evt.x} y={evt.y} amount={evt.amount} />
      ))}
    </AnimatePresence>
  );
}

function ParticleBurst({ x, y, amount }) {
  const [particles] = useState(() => {
    const count = Math.min(12, Math.max(4, Math.floor(amount / 100)));
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      offsetX: (Math.random() - 0.5) * 80,
      offsetY: -40 - Math.random() * 100,
      delay: Math.random() * 0.3,
      size: 4 + Math.random() * 4,
    }));
  });

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="fixed z-50 pointer-events-none rounded-full"
          style={{
            left: x,
            top: y,
            width: p.size,
            height: p.size,
            background: "radial-gradient(circle, #fbbf24, #f59e0b)",
            boxShadow: "0 0 6px #fbbf24",
          }}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{
            opacity: 0,
            x: p.offsetX,
            y: p.offsetY,
            scale: 0.3,
          }}
          transition={{
            duration: 1.8,
            delay: p.delay,
            ease: "easeOut",
          }}
        />
      ))}
      {/* Amount text */}
      <motion.div
        className="fixed z-50 pointer-events-none font-bold text-lg text-yellow-400"
        style={{
          left: x,
          top: y,
          textShadow: "0 0 8px rgba(251, 191, 36, 0.6)",
          transform: "translate(-100%, -50%)",
        }}
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 0, y: -70 }}
        transition={{ duration: 2.2 }}
      >
        +{amount} SP
      </motion.div>
    </>
  );
}
