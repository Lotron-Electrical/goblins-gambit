import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function DiceRoll({ dice, result, onComplete, mobileCenterY }) {
  const [rolling, setRolling] = useState(true);
  const [display, setDisplay] = useState([1, 1]);

  useEffect(() => {
    if (!dice) return;
    let cancelled = false;
    const timers = [];
    const interval = setInterval(() => {
      setDisplay([Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)]);
    }, 100);

    timers.push(
      setTimeout(() => {
        clearInterval(interval);
        if (cancelled) return;
        setDisplay(dice);
        setRolling(false);
        timers.push(
          setTimeout(() => {
            if (!cancelled) onComplete?.();
          }, 800),
        );
      }, 1200),
    );

    return () => {
      cancelled = true;
      clearInterval(interval);
      timers.forEach((t) => clearTimeout(t));
    };
  }, [dice]);

  if (!dice) return null;

  return (
    <div
      className={`fixed z-50 pointer-events-none ${
        mobileCenterY
          ? "left-1/2 -translate-x-1/2 -translate-y-1/2"
          : "inset-0 flex items-center justify-center"
      }`}
      style={mobileCenterY ? { top: `${mobileCenterY}px` } : undefined}
    >
      <div className="text-center">
        <div className="flex gap-4 justify-center mb-4">
          {display.map((d, i) => (
            <motion.div
              key={i}
              className="w-16 h-16 bg-white rounded-xl flex items-center justify-center text-3xl font-bold text-gray-900 shadow-xl"
              animate={
                rolling
                  ? { rotateX: [0, 360], rotateY: [0, 360] }
                  : { rotateX: 0, rotateY: 0 }
              }
              transition={
                rolling
                  ? { duration: 0.5, repeat: Infinity }
                  : { duration: 0.3 }
              }
            >
              {d}
            </motion.div>
          ))}
        </div>
        {!rolling && result !== undefined && (
          <motion.div
            className="text-2xl font-display text-[var(--color-gold)]"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {result}
          </motion.div>
        )}
      </div>
    </div>
  );
}
