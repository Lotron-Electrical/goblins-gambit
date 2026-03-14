import { useEffect } from 'react';
import { useStore } from '../../store.js';
import { ICONS, TYPE_ICON } from './icons.js';

const TYPE_BORDER = {
  Creature: 'border-red-600',
  Magic: 'border-blue-600',
  Armour: 'border-gray-500',
  Tricks: 'border-green-600',
};

export default function GraveyardModal() {
  const { gameState, graveyardOpen, setGraveyardOpen, setZoomedCard, clearHoveredCard } = useStore();

  // Clear any lingering hover preview when modal opens
  useEffect(() => {
    if (graveyardOpen) clearHoveredCard();
  }, [graveyardOpen, clearHoveredCard]);

  // Escape to close
  useEffect(() => {
    if (!graveyardOpen) return;
    const handler = (e) => { if (e.key === 'Escape') setGraveyardOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [graveyardOpen, setGraveyardOpen]);

  if (!graveyardOpen || !gameState) return null;

  const graveyard = gameState.graveyard || [];

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70"
      onClick={() => setGraveyardOpen(false)}
    >
      <div
        className="bg-gray-900 border border-[var(--color-gold)]/50 rounded-xl p-4 max-w-[600px] max-h-[70vh] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[var(--color-gold)] font-display text-lg">
            Graveyard ({graveyard.length})
          </h2>
          <button
            onClick={() => setGraveyardOpen(false)}
            className="text-gray-400 hover:text-white text-xl px-2"
          >
            &times;
          </button>
        </div>

        {graveyard.length === 0 ? (
          <div className="text-gray-500 text-center py-8">No cards in the graveyard</div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {[...graveyard].reverse().map((card, idx) => (
              <div
                key={`${card.uid}-${idx}`}
                className={`relative w-[120px] h-[168px] rounded-lg border-2 cursor-pointer overflow-hidden ${
                  TYPE_BORDER[card.type] || 'border-gray-600'
                } hover:ring-2 hover:ring-[var(--color-gold)]`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setZoomedCard(card);
                }}
                onClick={() => setZoomedCard(card)}
              >
                {/* Card art */}
                <div className="absolute inset-0 h-[65%] overflow-hidden">
                  {card.image && (
                    <img
                      src={`/cards/${card.image}`}
                      alt={card.name}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  )}
                </div>

                {/* Type icon */}
                <div className="absolute top-1 left-1 text-[12px] bg-black/60 w-5 h-5 rounded-full flex items-center justify-center z-10">
                  {TYPE_ICON[card.type]}
                </div>

                {/* Dark bottom section */}
                <div className="absolute bottom-0 left-0 right-0 h-[35%] bg-gray-950 p-1 flex flex-col justify-center">
                  <div className="text-white text-[11px] font-bold truncate text-center leading-tight">
                    {card.name}
                  </div>
                  {card.type === 'Creature' && (
                    <div className="flex justify-between text-[10px] px-1 mt-0.5">
                      <span className="text-red-400 font-bold">{ICONS.swords}{card.attack}</span>
                      <span className="text-blue-400 font-bold">{ICONS.shield}{card.defence}</span>
                      <span className="text-yellow-400 font-bold">{ICONS.coin}{card.sp}</span>
                    </div>
                  )}
                  {card.type !== 'Creature' && (
                    <div className="text-gray-400 text-[9px] text-center mt-0.5">{card.type}</div>
                  )}
                </div>

                {/* Grayscale overlay to indicate dead */}
                <div className="absolute inset-0 bg-black/20 pointer-events-none" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
