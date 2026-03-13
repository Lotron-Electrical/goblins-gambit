import { useStore } from '../../store.js';
import { motion, AnimatePresence } from 'framer-motion';

const TYPE_BORDER = {
  Creature: 'border-red-600',
  Magic: 'border-blue-600',
  Armour: 'border-gray-500',
  Tricks: 'border-green-600',
};

export default function CenterZone({ deckCount, graveyardCount, graveyard, stagedCard }) {
  const { setGraveyardOpen, setZoomedCard } = useStore();
  const topGraveyardCard = graveyard?.length > 0 ? graveyard[graveyard.length - 1] : null;

  return (
    <div className="flex-shrink-0 h-[80px] mx-4 flex items-center justify-center gap-8 relative">
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

      {/* Staged card — briefly shown when a card is played */}
      <AnimatePresence>
        {stagedCard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ duration: 0.25 }}
            className={`absolute left-1/2 -translate-x-1/2 w-[90px] h-[65px] rounded-lg border-2 overflow-hidden shadow-2xl z-10 ${
              TYPE_BORDER[stagedCard.type] || 'border-gray-600'
            }`}
          >
            {stagedCard.image && (
              <img
                src={`/cards/${stagedCard.image}`}
                alt={stagedCard.name}
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gray-950/90 px-1 py-0.5">
              <div className="text-white text-[10px] font-bold truncate text-center">{stagedCard.name}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
