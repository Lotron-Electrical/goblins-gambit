import { useEffect } from 'react';
import { useStore } from '../../store.js';

export default function CardChoiceModal() {
  const { gameState, chooseCard, clearHoveredCard } = useStore();
  const pending = gameState?.pendingChoice;

  // Clear any lingering hover preview when modal opens
  useEffect(() => {
    if (pending) clearHoveredCard();
  }, [pending, clearHoveredCard]);

  if (!pending) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 pointer-events-auto">
      <div className="bg-gray-900 border border-[var(--color-gold)] rounded-xl p-6 max-w-lg shadow-2xl">
        <h3 className="text-xl font-display text-[var(--color-gold)] mb-3">
          {pending.type === 'dead_meme' ? 'Dead Meme Revive' : 'Choose a Card'}
        </h3>
        <p className="text-[14px] text-gray-300 mb-4">{pending.prompt}</p>
        <div className="grid grid-cols-3 gap-2">
          {pending.cards.map((card) => (
            <button
              key={card.uid}
              onClick={() => chooseCard(card.uid)}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-[var(--color-gold)] rounded-lg p-3 transition text-center"
            >
              <div className="text-white font-bold text-[13px] truncate">{card.name}</div>
              <div className="text-[11px] text-gray-400">{card.type}</div>
              {card.type === 'Creature' && (
                <div className="text-[10px] mt-1">
                  <span className="text-red-400">ATK {card.attack}</span>
                  <span className="text-gray-600 mx-1">/</span>
                  <span className="text-blue-400">DEF {card.defence}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
