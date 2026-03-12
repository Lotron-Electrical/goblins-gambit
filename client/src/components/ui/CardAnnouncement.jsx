import { motion, AnimatePresence } from 'framer-motion';

const TYPE_COLOR = {
  Creature: 'text-red-400',
  Magic: 'text-blue-400',
  Armour: 'text-gray-300',
  Tricks: 'text-green-400',
};

export default function CardAnnouncement({ announcement }) {
  return (
    <AnimatePresence>
      {announcement && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.2 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-center">
            <div className={`font-display text-3xl ${TYPE_COLOR[announcement.type] || 'text-white'} drop-shadow-lg`}>
              {announcement.name}
            </div>
            {announcement.flavor && (
              <div className="text-lg text-[var(--color-gold)] font-display mt-1 drop-shadow-md">
                {announcement.flavor}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
