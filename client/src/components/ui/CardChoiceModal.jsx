import { useEffect } from "react";
import { useStore } from "../../store.js";

const TYPE_BORDER_HOVER = {
  Creature: "hover:border-red-500 hover:shadow-[0_0_12px_rgba(220,38,38,0.25)]",
  Magic: "hover:border-blue-500 hover:shadow-[0_0_12px_rgba(37,99,235,0.25)]",
  Armour: "hover:border-gray-400 hover:shadow-[0_0_12px_rgba(156,163,175,0.2)]",
  Tricks: "hover:border-green-500 hover:shadow-[0_0_12px_rgba(22,163,74,0.25)]",
};

const TYPE_COLOR_TEXT = {
  Creature: "text-red-400",
  Magic: "text-blue-400",
  Armour: "text-gray-400",
  Tricks: "text-green-400",
};

export default function CardChoiceModal({ mobileCenterY }) {
  const { gameState, chooseCard, clearHoveredCard } = useStore();
  const pending = gameState?.pendingChoice;

  // Clear any lingering hover preview when modal opens
  useEffect(() => {
    if (pending) clearHoveredCard();
  }, [pending, clearHoveredCard]);

  if (!pending) return null;

  const isPeek = pending.type === "woke_peek" || pending.type === "ama_reveal";

  const handleDismiss = () => {
    // Send a dummy choose to clear the pendingChoice on server
    chooseCard(pending.cards.length > 0 ? pending.cards[0].uid : "__dismiss__");
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px] pointer-events-auto">
      <div
        className={`absolute p-3 ${
          mobileCenterY
            ? "left-0 right-0 -translate-y-1/2 flex justify-center"
            : "inset-0 flex items-center justify-center"
        }`}
        style={mobileCenterY ? { top: `${mobileCenterY}px` } : undefined}
      >
        <div
          className="bg-gray-900/95 border border-[var(--color-gold)] rounded-xl p-4 sm:p-6 max-w-lg w-full"
          style={{ boxShadow: "0 0 40px rgba(212, 175, 55, 0.15), 0 8px 32px rgba(0, 0, 0, 0.6)" }}
        >
          <h3
            className="text-lg sm:text-xl font-display text-[var(--color-gold)] mb-2 sm:mb-3"
            style={{ textShadow: "0 0 12px rgba(212, 175, 55, 0.3)" }}
          >
            {pending.type === "dead_meme"
              ? "Dead Meme Revive"
              : pending.type === "ama_reveal"
                ? "AMA - Hand Revealed"
                : isPeek
                  ? "Woke - Deck Peek"
                  : "Choose a Card"}
          </h3>
          <p className="text-[13px] sm:text-[14px] text-gray-300 mb-3 sm:mb-4">
            {pending.prompt}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {isPeek && pending.cards.length === 0 && (
              <div className="col-span-2 sm:col-span-3 text-center text-gray-500 py-4">
                Deck is empty!
              </div>
            )}
            {pending.cards.map((card) => (
              <button
                key={card.uid}
                onClick={() => !isPeek && chooseCard(card.uid)}
                className={`border rounded-lg p-3 transition-all duration-200 text-center ${
                  isPeek
                    ? "bg-gray-800/80 border-gray-600 cursor-default"
                    : `bg-gray-800/80 border-gray-700 cursor-pointer hover:bg-gray-750 hover:-translate-y-0.5 ${TYPE_BORDER_HOVER[card.type] || "hover:border-[var(--color-gold)]"}`
                }`}
              >
                <div className="text-white font-bold text-[13px] truncate">
                  {card.name}
                </div>
                <div className={`text-[11px] ${TYPE_COLOR_TEXT[card.type] || "text-gray-400"}`}>
                  {card.type}
                </div>
                {card.type === "Creature" && (
                  <div className="text-[10px] mt-1.5 flex justify-center gap-2">
                    <span className="text-red-400 font-medium">ATK {card.attack}</span>
                    <span className="text-gray-600">|</span>
                    <span className="text-blue-400 font-medium">DEF {card.defence}</span>
                  </div>
                )}
                {card.effect && (
                  <div className="text-[9px] text-gray-500 mt-1 line-clamp-2 italic leading-tight">
                    {card.effect}
                  </div>
                )}
              </button>
            ))}
          </div>
          {isPeek && (
            <button
              onClick={handleDismiss}
              className="mt-4 w-full bg-[var(--color-gold)] hover:bg-yellow-400 text-black font-bold py-2.5 rounded-lg transition-all duration-200 hover:shadow-[0_0_16px_rgba(212,175,55,0.4)]"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
