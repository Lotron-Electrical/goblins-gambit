import { motion, AnimatePresence } from 'framer-motion';

export default function DamageNumber({ damages }) {
  return (
    <AnimatePresence>
      {damages.map((d, i) => (
        <motion.div
          key={d.id}
          className="fixed z-50 pointer-events-none font-bold text-xl"
          style={{ left: d.x || '50%', top: d.y || '40%' }}
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 0, y: -40 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className={d.amount > 0 ? 'text-green-400' : 'text-red-500'}>
            {d.amount > 0 ? '+' : ''}{d.amount}
          </span>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
