import { useStore } from '../../store.js';

export default function CenterZone({ deckCount, graveyardCount, graveyard }) {
  const { setGraveyardOpen, setZoomedCard } = useStore();
  const topGraveyardCard = graveyard?.length > 0 ? graveyard[graveyard.length - 1] : null;

  return (
    <div className="flex-shrink-0 h-[80px] mx-4 flex items-center justify-center gap-8">
      {/* Deck stack */}
      <div className="flex flex-col items-center gap-1">
        <div className="relative w-[70px] h-[50px]">
          {deckCount > 0 ? (
            <>
              {/* Stacked card backs */}
              {deckCount > 2 && (
                <div className="absolute top-0 left-1 w-[66px] h-[46px] rounded border-2 border-[var(--color-gold)]/40 bg-green-950" />
              )}
              {deckCount > 1 && (
                <div className="absolute top-[2px] left-[2px] w-[66px] h-[46px] rounded border-2 border-[var(--color-gold)]/50 bg-green-900" />
              )}
              <div className="absolute top-1 left-0 w-[66px] h-[46px] rounded border-2 border-[var(--color-gold)]/70 bg-green-800 flex items-center justify-center">
                <div className="w-[50px] h-[34px] border border-[var(--color-gold)]/30 rounded-sm bg-green-900/60 flex items-center justify-center">
                  <span className="text-[var(--color-gold)]/60 text-[16px]">&#x2666;</span>
                </div>
              </div>
            </>
          ) : (
            <div className="absolute top-1 left-0 w-[66px] h-[46px] rounded border-2 border-dashed border-gray-700 flex items-center justify-center">
              <span className="text-gray-600 text-[11px]">Empty</span>
            </div>
          )}
        </div>
        <span className="text-gray-400 text-[11px]">{deckCount} cards</span>
      </div>

      {/* Center divider line */}
      <div className="h-[40px] w-px bg-[var(--color-gold)]/30" />

      {/* Graveyard */}
      <div className="flex flex-col items-center gap-1">
        <div
          className="relative w-[70px] h-[50px] cursor-pointer"
          onClick={() => graveyardCount > 0 && setGraveyardOpen(true)}
        >
          {topGraveyardCard ? (
            <>
              {/* Offset cards behind for depth */}
              {graveyardCount > 2 && (
                <div className="absolute top-0 left-1 w-[66px] h-[46px] rounded border border-gray-600 bg-gray-800" />
              )}
              {graveyardCount > 1 && (
                <div className="absolute top-[2px] left-[2px] w-[66px] h-[46px] rounded border border-gray-600 bg-gray-800" />
              )}
              {/* Top card face-up with dark overlay */}
              <div className="absolute top-1 left-0 w-[66px] h-[46px] rounded border border-gray-500 overflow-hidden">
                {topGraveyardCard.image && (
                  <img
                    src={`/cards/${topGraveyardCard.image}`}
                    alt={topGraveyardCard.name}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                )}
                <div className="absolute inset-0 bg-black/50" />
                {/* Count badge */}
                <div className="absolute top-0.5 right-0.5 bg-red-700 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {graveyardCount}
                </div>
              </div>
            </>
          ) : (
            <div className="absolute top-1 left-0 w-[66px] h-[46px] rounded border-2 border-dashed border-gray-700 flex items-center justify-center">
              <span className="text-gray-600 text-[11px]">Empty</span>
            </div>
          )}
        </div>
        <span className="text-gray-400 text-[11px]">Graveyard</span>
      </div>
    </div>
  );
}
