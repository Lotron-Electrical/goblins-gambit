import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';

const TYPE_COLOR = {
  Creature: 'text-red-400',
  Magic: 'text-blue-400',
  Armour: 'text-gray-300',
  Tricks: 'text-green-400',
};

const TYPE_BORDER = {
  Creature: 'border-red-600/60',
  Magic: 'border-blue-600/60',
  Armour: 'border-gray-500/60',
  Tricks: 'border-green-600/60',
};

const TYPE_BG = {
  Creature: 'bg-red-950/80',
  Magic: 'bg-blue-950/80',
  Armour: 'bg-gray-900/80',
  Tricks: 'bg-green-950/80',
};

// Major events get the big centered treatment
const MAJOR_EVENTS = ['Event'];

export default function CardAnnouncement({ announcement }) {
  const animationsOff = useStore(s => s.animationsOff);
  const isMobile = useIsMobile();
  const dur = animationsOff ? 0 : 0.25;

  const isMajor = announcement && MAJOR_EVENTS.includes(announcement.type);

  return (
    <AnimatePresence>
      {announcement && isMajor && (
        <motion.div
          key="major"
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.2 }}
          transition={{ duration: dur }}
        >
          <div className="text-center">
            <div className="font-display text-4xl text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              {announcement.name}
            </div>
            {announcement.flavor && (
              <div className="text-xl text-[var(--color-gold)] font-display mt-2 drop-shadow-md">
                {announcement.flavor}
              </div>
            )}
          </div>
        </motion.div>
      )}
      {announcement && !isMajor && (
        <motion.div
          key="toast"
          className={`fixed z-50 pointer-events-none ${
            isMobile ? 'bottom-36 left-1/2 -translate-x-1/2' : 'top-16 right-4'
          }`}
          initial={isMobile ? { opacity: 0, y: 20 } : { opacity: 0, x: 80 }}
          animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, x: 0 }}
          exit={isMobile ? { opacity: 0, y: -10 } : { opacity: 0, x: 40 }}
          transition={{ duration: dur }}
        >
          <div className={`flex items-center gap-2 border rounded-lg shadow-lg backdrop-blur-sm ${
            isMobile ? 'px-3 py-2' : 'px-4 py-2.5'
          } ${TYPE_BORDER[announcement.type] || 'border-gray-600/60'} ${TYPE_BG[announcement.type] || 'bg-gray-900/80'}`}>
            <div>
              <div className={`font-display ${isMobile ? 'text-base' : 'text-lg'} ${TYPE_COLOR[announcement.type] || 'text-white'}`}>
                {announcement.name}
              </div>
              {announcement.flavor && (
                <div className={`text-[var(--color-gold)] font-display ${isMobile ? 'text-[11px]' : 'text-sm'}`}>
                  {announcement.flavor}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
