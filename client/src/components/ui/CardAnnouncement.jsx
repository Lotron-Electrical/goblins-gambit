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
  Creature: "bg-red-950/85",
  Magic: "bg-blue-950/85",
  Armour: "bg-gray-900/85",
  Tricks: "bg-green-950/85",
};

const TYPE_GLOW_SHADOW = {
  Creature: "0 0 30px rgba(220, 38, 38, 0.3), 0 4px 20px rgba(0, 0, 0, 0.5)",
  Magic: "0 0 30px rgba(37, 99, 235, 0.3), 0 4px 20px rgba(0, 0, 0, 0.5)",
  Armour: "0 0 30px rgba(156, 163, 175, 0.2), 0 4px 20px rgba(0, 0, 0, 0.5)",
  Tricks: "0 0 30px rgba(22, 163, 74, 0.3), 0 4px 20px rgba(0, 0, 0, 0.5)",
};

// Major events get the big centered treatment
const MAJOR_EVENTS = ["Event"];

export default function CardAnnouncement({
  announcement,
  mobileCenterY,
  hasStaged,
}) {
  const animationsOff = useStore((s) => s.animationsOff);
  const centerZoneY = useStore((s) => s.centerZoneY);
  const isMobile = useIsMobile();
  const dur = animationsOff ? 0 : 0.25;

  const isMajor = announcement && MAJOR_EVENTS.includes(announcement.type);

  // Position at the center zone midpoint; fall back to 45% on mobile
  const centerTop =
    mobileCenterY || centerZoneY ? `${mobileCenterY || centerZoneY}px` : "45%";

  // Position toast above the staged card's visual top edge
  const cardHalfH = isMobile ? 23 : 31;
  const gap = 4;
  const rawY = mobileCenterY || centerZoneY;
  const toastTop = rawY ? `${rawY - cardHalfH - gap}px` : "40%";

  return (
    <AnimatePresence>
      {announcement && isMajor && (
        <motion.div
          key="major"
          className="fixed z-50 pointer-events-none"
          style={{ left: "50%", top: centerTop }}
          initial={{
            opacity: 0,
            scale: 0.4,
            filter: "blur(8px)",
            x: "-50%",
            y: "-50%",
          }}
          animate={{
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            x: "-50%",
            y: "-50%",
          }}
          exit={{
            opacity: 0,
            scale: 1.15,
            filter: "blur(4px)",
            x: "-50%",
            y: "-50%",
          }}
          transition={{ duration: dur, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="text-center w-fit max-w-[85vw]">
            <div
              className={`font-display text-white animate-announce-burst ${isMobile ? "text-2xl" : "text-4xl"}`}
              style={{
                textShadow:
                  "0 0 30px rgba(255, 255, 255, 0.3), 0 2px 8px rgba(0, 0, 0, 0.5)",
              }}
            >
              {announcement.name}
            </div>
            {announcement.flavor && (
              <div
                className={`text-[var(--color-gold)] font-display mt-2 ${isMobile ? "text-base" : "text-xl"}`}
                style={{ textShadow: "0 0 12px rgba(212, 175, 55, 0.4)" }}
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
          className="fixed z-50 pointer-events-none"
          style={{ left: "50%", top: hasStaged ? toastTop : centerTop }}
          initial={{
            opacity: 0,
            scale: 0.85,
            x: "-50%",
            y: hasStaged ? "-100%" : "-50%",
          }}
          animate={{
            opacity: 1,
            scale: 1,
            x: "-50%",
            y: hasStaged ? "-100%" : "-50%",
          }}
          exit={{
            opacity: 0,
            scale: 0.92,
            x: "-50%",
            y: hasStaged ? "-100%" : "-50%",
          }}
          transition={{ duration: dur, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className={`w-fit max-w-[85vw] flex items-center gap-2 border rounded-lg backdrop-blur-md text-center ${
              isMobile ? "px-3 py-1.5" : "px-5 py-3"
            } ${TYPE_BORDER[announcement.type] || "border-gray-600/60"} ${TYPE_BG[announcement.type] || "bg-gray-900/85"}`}
            style={{
              boxShadow:
                TYPE_GLOW_SHADOW[announcement.type] ||
                "0 4px 20px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div>
              <div
                className={`font-display ${isMobile ? "text-base" : "text-xl"} ${TYPE_COLOR[announcement.type] || "text-white"}`}
                style={{ textShadow: "0 1px 4px rgba(0, 0, 0, 0.4)" }}
              >
                {announcement.name}
              </div>
              {announcement.flavor && (
                <div
                  className={`text-[var(--color-gold)] font-display ${isMobile ? "text-[11px]" : "text-base"}`}
                  style={{ textShadow: "0 0 8px rgba(212, 175, 55, 0.3)" }}
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
