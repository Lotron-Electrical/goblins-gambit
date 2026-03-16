import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../../store.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";

const TYPE_COLOR = {
  Creature: "text-red-400",
  Magic: "text-blue-400",
  Armour: "text-gray-300",
  Tricks: "text-green-400",
};

const TYPE_BORDER = {
  Creature: "border-red-600/60",
  Magic: "border-blue-600/60",
  Armour: "border-gray-500/60",
  Tricks: "border-green-600/60",
};

const TYPE_BG = {
  Creature: "bg-red-950/80",
  Magic: "bg-blue-950/80",
  Armour: "bg-gray-900/80",
  Tricks: "bg-green-950/80",
};

// Major events get the big centered treatment
const MAJOR_EVENTS = ["Event"];

export default function CardAnnouncement({ announcement, mobileCenterY }) {
  const animationsOff = useStore((s) => s.animationsOff);
  const centerZoneY = useStore((s) => s.centerZoneY);
  const isMobile = useIsMobile();
  const dur = animationsOff ? 0 : 0.25;

  const isMajor = announcement && MAJOR_EVENTS.includes(announcement.type);

  // Position at the center zone midpoint; fall back to 50% (true center) on mobile
  const centerTop =
    mobileCenterY || centerZoneY
      ? `${mobileCenterY || centerZoneY}px`
      : isMobile
        ? "50%"
        : "35%";

  return (
    <AnimatePresence>
      {announcement && isMajor && (
        <motion.div
          key="major"
          className={`fixed z-50 pointer-events-none left-1/2 -translate-x-1/2 -translate-y-1/2 ${
            isMobile
              ? ""
              : "inset-0 !left-auto !top-auto !translate-x-0 !translate-y-0 flex items-center justify-center"
          }`}
          style={isMobile ? { top: centerTop } : undefined}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.2 }}
          transition={{ duration: dur }}
        >
          <div className="text-center">
            <div
              className={`font-display text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] ${isMobile ? "text-2xl" : "text-4xl"}`}
            >
              {announcement.name}
            </div>
            {announcement.flavor && (
              <div
                className={`text-[var(--color-gold)] font-display mt-2 drop-shadow-md ${isMobile ? "text-base" : "text-xl"}`}
              >
                {announcement.flavor}
              </div>
            )}
          </div>
        </motion.div>
      )}
      {announcement && !isMajor && (
        <motion.div
          key="toast"
          className="fixed z-50 pointer-events-none left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ top: centerTop }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: dur }}
        >
          <div
            className={`flex items-center gap-2 border rounded-lg shadow-lg backdrop-blur-sm text-center ${
              isMobile ? "px-4 py-2.5" : "px-5 py-3"
            } ${TYPE_BORDER[announcement.type] || "border-gray-600/60"} ${TYPE_BG[announcement.type] || "bg-gray-900/80"}`}
          >
            <div>
              <div
                className={`font-display ${isMobile ? "text-lg" : "text-xl"} ${TYPE_COLOR[announcement.type] || "text-white"}`}
              >
                {announcement.name}
              </div>
              {announcement.flavor && (
                <div
                  className={`text-[var(--color-gold)] font-display ${isMobile ? "text-[12px]" : "text-base"}`}
                >
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
