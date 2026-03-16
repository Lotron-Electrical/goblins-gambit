import { useState, useRef, useEffect } from "react";
import { useStore } from "../../store.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { CHAT_EMOTES } from "../../../../shared/src/constants.js";

// Deterministic color from playerId
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

const RATE_LIMIT_MS = 1000;

export default function ChatPanel({ expanded, onClose }) {
  const { chatMessages, sendChatMessage, sendChatEmote, gameState } =
    useStore();
  const isMobile = useIsMobile();
  const [text, setText] = useState("");
  const [rateLimited, setRateLimited] = useState(false);
  const lastSendRef = useRef(0);
  const listRef = useRef(null);
  const myId = gameState?.myId;

  // Auto-scroll to bottom on new messages or when panel opens
  useEffect(() => {
    if (expanded && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [chatMessages, expanded]);

  if (!expanded) return null;

  const trySend = () => {
    const now = Date.now();
    if (now - lastSendRef.current < RATE_LIMIT_MS) {
      setRateLimited(true);
      setTimeout(() => setRateLimited(false), 1500);
      return false;
    }
    lastSendRef.current = now;
    return true;
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!trySend()) return;
    sendChatMessage(trimmed);
    setText("");
  };

  const handleEmote = (emoteKey) => {
    if (!trySend()) return;
    sendChatEmote(emoteKey);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const emoteMap = {};
  for (const e of CHAT_EMOTES) emoteMap[e.key] = e;

  return (
    <>
      {/* Invisible backdrop — tap outside to close */}
      <div className="fixed inset-0 z-[39]" onClick={onClose} />
      <div
        className={`fixed right-2 z-40 bg-gray-950/95 border border-gray-700 rounded-lg shadow-2xl overflow-hidden flex flex-col ${
          isMobile
            ? "w-[280px] max-h-[300px] top-[41px]"
            : "w-[300px] max-h-[350px] top-[49px]"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-1 border-b border-gray-800 shrink-0">
          <span className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">
            Chat
          </span>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-[16px] leading-none w-5 h-5 flex items-center justify-center"
          >
            &times;
          </button>
        </div>

        {/* Messages */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0"
        >
          {chatMessages.length === 0 && (
            <p className="text-gray-600 text-[11px] text-center py-4">
              No messages yet
            </p>
          )}
          {chatMessages.map((msg) => {
            const isOwn = msg.playerId === myId;
            const emote = msg.emoteKey ? emoteMap[msg.emoteKey] : null;
            const nameColor = isOwn ? "#9ca3af" : colorForPlayer(msg.playerId);
            return (
              <div
                key={msg.id}
                className={`text-[12px] leading-tight break-words ${isOwn ? "text-right" : ""}`}
              >
                <span className="font-bold" style={{ color: nameColor }}>
                  {isOwn ? "You" : msg.playerName}:{" "}
                </span>
                {emote ? (
                  <span className="text-[15px]">
                    {emote.emoji} {emote.label}
                  </span>
                ) : (
                  <span className={isOwn ? "text-gray-400" : "text-gray-200"}>
                    {msg.text}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Rate limit warning */}
        {rateLimited && (
          <div className="text-center text-[10px] text-yellow-500 py-0.5 bg-yellow-500/10">
            Slow down...
          </div>
        )}

        {/* Emote row */}
        <div className="flex gap-1 px-2 py-1 justify-center border-t border-gray-800 shrink-0">
          {CHAT_EMOTES.map((e) => (
            <button
              key={e.key}
              onClick={() => handleEmote(e.key)}
              className="text-[16px] hover:scale-125 transition-transform shrink-0 px-0.5"
              title={e.label}
            >
              {e.emoji}
            </button>
          ))}
        </div>

        {/* Text input */}
        <div className="flex gap-1 px-2 py-1.5 border-t border-gray-800 shrink-0">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={100}
            placeholder="Say something..."
            className="flex-1 bg-gray-800 text-gray-200 text-[12px] rounded px-2 py-1 outline-none focus:ring-1 focus:ring-gray-600 min-w-0"
          />
          <button
            onClick={handleSend}
            className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-[11px] font-bold rounded px-2 py-1 transition shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
}
