import { motion, AnimatePresence } from "framer-motion";

export default function DamageNumber({ damages }) {
  // Offset overlapping damage numbers on the same card
  const offsets = {};
  const getOffset = (cardUid) => {
    if (!cardUid) return 0;
    offsets[cardUid] = (offsets[cardUid] || 0) + 1;
    return (offsets[cardUid] - 1) * 20; // stagger by 20px horizontally
  };

  return (
    <AnimatePresence>
      {damages.map((d) => {
        const xOffset = getOffset(d.cardUid);
        return (
          <motion.div
            key={d.id}
            className="fixed z-50 pointer-events-none font-bold text-xl"
            style={{
              left: typeof d.x === "number" ? d.x + xOffset : d.x,
              top: d.y || "40%",
            }}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -40 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className={d.amount > 0 ? "text-green-400" : "text-red-500"}>
              {d.amount > 0 ? "+" : ""}
              {d.amount}
            </span>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
