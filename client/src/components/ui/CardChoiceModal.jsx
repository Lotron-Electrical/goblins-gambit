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

  const isPeek = pending.type === 'woke_peek' || pending.type === 'ama_reveal';

  const handleDismiss = () => {
    // Send a dummy choose to clear the pendingChoice on server
    chooseCard(pending.cards.length > 0 ? pending.cards[0].uid : '__dismiss__');
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 pointer-events-auto p-3">
      <div className="bg-gray-900 border border-[var(--color-gold)] rounded-xl p-4 sm:p-6 max-w-lg w-full shadow-2xl">
        <h3 className="text-lg sm:text-xl font-display text-[var(--color-gold)] mb-2 sm:mb-3">
          {pending.type === 'dead_meme' ? 'Dead Meme Revive' : pending.type === 'ama_reveal' ? 'AMA - Hand Revealed' : isPeek ? 'Woke - Deck Peek' : 'Choose a Card'}
        </h3>
        <p className="text-[13px] sm:text-[14px] text-gray-300 mb-3 sm:mb-4">{pending.prompt}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {isPeek && pending.cards.length === 0 && (
            <div className="col-span-2 sm:col-span-3 text-center text-gray-500 py-4">Deck is empty!</div>
          )}
          {pending.cards.map((card) => (
            <button
              key={card.uid}
              onClick={() => !isPeek && chooseCard(card.uid)}
              className={`border rounded-lg p-3 transition text-center ${
                isPeek
                  ? 'bg-gray-800 border-gray-600 cursor-default'
                  : 'bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-[var(--color-gold)] cursor-pointer'
              }`}
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
        {isPeek && (
          <button
            onClick={handleDismiss}
            className="mt-4 w-full bg-[var(--color-gold)] hover:bg-yellow-400 text-black font-bold py-2 rounded-lg transition"
          >
            Got it
          </button>
        )}
      </div>
    </div>
  );
}
