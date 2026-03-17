import { useState, useEffect, useRef } from "react";
import { useStore } from "../../store.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { CHAT_EMOTES } from "../../../../shared/src/constants.js";
import { motion, AnimatePresence } from "framer-motion";

const PLAYER_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
];
function colorForPlayer(playerId) {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = ((hash << 5) - hash + playerId.charCodeAt(i)) | 0;
  }
  return PLAYER_COLORS[Math.abs(hash) % PLAYER_COLORS.length];
}

const emoteMap = {};
for (const e of CHAT_EMOTES) emoteMap[e.key] = e;

const MAX_BUBBLES = 3;
const BUBBLE_DURATION = 4000;

export default function ChatBubbles() {
  const { chatMessages, chatOpen, gameState } = useStore();
  const isMobile = useIsMobile();
  const [bubbles, setBubbles] = useState([]);
  const prevLenRef = useRef(chatMessages.length);
  const myId = gameState?.myId;

  useEffect(() => {
    const prevLen = prevLenRef.current;
    prevLenRef.current = chatMessages.length;

    if (chatOpen) return; // don't show bubbles when chat panel is open
    if (chatMessages.length <= prevLen) return; // no new messages

    // Get new messages that aren't from us
    const newMsgs = chatMessages
      .slice(prevLen)
      .filter((msg) => msg.playerId !== myId);
    if (newMsgs.length === 0) return;

    setBubbles((prev) => {
      const added = newMsgs.map((msg) => ({
        ...msg,
        bubbleId: msg.id + "-" + Date.now(),
      }));
      // Keep max 3, newest at end
      return [...prev, ...added].slice(-MAX_BUBBLES);
    });

    // Auto-remove each bubble after BUBBLE_DURATION
    for (const msg of newMsgs) {
      setTimeout(() => {
        setBubbles((prev) => prev.filter((b) => b.id !== msg.id));
      }, BUBBLE_DURATION);
    }
  }, [chatMessages.length, chatOpen, myId]);

  // Clear bubbles when chat opens
  useEffect(() => {
    if (chatOpen) setBubbles([]);
  }, [chatOpen]);

  if (bubbles.length === 0) return null;

  return (
    <div
      className={`fixed right-2 z-30 flex flex-col gap-1.5 pointer-events-none ${
        isMobile ? "top-[41px]" : "top-[49px]"
      }`}
      style={{ maxWidth: isMobile ? 240 : 260 }}
    >
      <AnimatePresence>
        {bubbles.map((msg) => {
          const emote = msg.emoteKey ? emoteMap[msg.emoteKey] : null;
          const nameColor = colorForPlayer(msg.playerId);
          return (
            <motion.div
              key={msg.bubbleId || msg.id}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-gray-900/90 border border-gray-700 rounded-lg px-2.5 py-1.5 shadow-lg"
            >
              <div className="text-[12px] leading-tight break-words">
                <span className="font-bold" style={{ color: nameColor }}>
                  {msg.playerName}:{" "}
                </span>
                {emote ? (
                  <span className="text-[14px]">
                    {emote.emoji} {emote.label}
                  </span>
                ) : (
                  <span className="text-gray-200">{msg.text}</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
