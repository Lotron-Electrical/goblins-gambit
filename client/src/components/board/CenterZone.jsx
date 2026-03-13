import { useMemo } from 'react';
import { useStore } from '../../store.js';
import { motion, AnimatePresence } from 'framer-motion';

const TYPE_BORDER = {
  Creature: 'border-red-600',
  Magic: 'border-blue-600',
  Armour: 'border-gray-500',
  Tricks: 'border-green-600',
};

function getDeckRotations(count) {
  const rotations = [];
  for (let i = 0; i < Math.min(count, 6); i++) {
    rotations.push(Math.sin(i * 7.3 + 2.1) * 2);
  }
  return rotations;
}

function CardFace({ card, className = '', style = {} }) {
  return (
    <div
      className={`w-[90px] h-[126px] rounded-lg border-2 overflow-hidden flex flex-col ${
        TYPE_BORDER[card.type] || 'border-gray-600'
      } ${className}`}
      style={style}
    >
      <div className="relative w-full" style={{ height: '70%' }}>
        {card.image ? (
          <img
            src={`/cards/${card.image}`}
            alt={card.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-gray-800" />
        )}
        <div className="absolute inset-0 bg-black/30" />
      </div>
      <div className="bg-gray-950 px-1 py-0.5 flex flex-col justify-center flex-1">
        <div className="text-white text-[9px] font-bold truncate text-center">{card.name}</div>
        {card.type === 'Creature' && (
          <div className="text-[8px] text-center">
            <span className="text-red-400">{card.attack}</span>
            <span className="text-gray-600 mx-0.5">/</span>
            <span className="text-blue-400">{card.defence}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CardBack({ className = '', style = {} }) {
  return (
    <div
      className={`w-[90px] h-[126px] rounded-lg border-2 border-[var(--color-gold)] overflow-hidden shadow-lg ${className}`}
      style={style}
    >
      <img
        src="/cards/Card back.png"
        alt="Card back"
        className="w-full h-full object-cover"
        draggable={false}
      />
    </div>
  );
}

export default function CenterZone({ deckCount, graveyardCount, graveyard, stagedCards = [] }) {
  const { setGraveyardOpen } = useStore();

  const graveyardRotations = useMemo(() => {
    return (graveyard || []).map((_, i) => Math.sin(i * 5.7 + 1.3) * 8);
  }, [graveyard?.length]);

  const deckRotations = useMemo(() => getDeckRotations(deckCount), [deckCount]);

  return (
    <div className="flex-shrink-0 h-[140px] flex items-center justify-between px-[calc(12.5%+500px)] relative">
      {/* Deck stack — left side */}
      <div className="flex flex-col items-center gap-1">
        <div className="relative w-[90px] h-[126px]">
          {deckCount > 0 ? (
            <>
              {deckRotations.map((rot, i) => {
                if (i === deckRotations.length - 1) return null;
                return (
                  <div
                    key={i}
                    className="absolute"
                    style={{
                      top: `${-i * 0.5}px`,
                      left: `${i * 0.3}px`,
                      transform: `rotate(${rot}deg)`,
                    }}
                  >
                    <CardBack className="border-[var(--color-gold)]/40 shadow-none" />
                  </div>
                );
              })}
              <div
                className="absolute"
                style={{
                  top: '0px',
                  left: '0px',
                  transform: `rotate(${deckRotations[deckRotations.length - 1] || 0}deg)`,
                }}
              >
                <CardBack />
              </div>
            </>
          ) : (
            <div className="w-[90px] h-[126px] rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center">
              <span className="text-gray-600 text-[11px]">Empty</span>
            </div>
          )}
        </div>
        <span className="text-gray-400 text-[11px]">{deckCount} cards</span>
      </div>

      {/* Staged card stack — center, Uno-style */}
      {stagedCards.length > 0 && (
        <div className="relative w-[110px] h-[154px] z-10">
          <AnimatePresence>
            {stagedCards.map((card) => (
              <motion.div
                key={card._stagedId}
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                transition={{ duration: 0.3 }}
                style={{ rotate: `${card._rotation}deg` }}
                className={`absolute inset-0 w-[110px] h-[154px] rounded-lg border-2 overflow-hidden shadow-2xl flex flex-col ${
                  TYPE_BORDER[card.type] || 'border-gray-600'
                }`}
              >
                <div className="relative w-full" style={{ height: '70%' }}>
                  {card.image ? (
                    <img
                      src={`/cards/${card.image}`}
                      alt={card.name}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800" />
                  )}
                  <div className="absolute top-1 right-1 bg-blue-700 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {card.cost}
                  </div>
                </div>
                <div className="bg-gray-950/90 px-1.5 py-1 flex flex-col justify-center flex-1">
                  <div className="text-white text-[11px] font-bold truncate text-center">{card.name}</div>
                  {card.type === 'Creature' && (
                    <div className="text-[9px] text-center mt-0.5">
                      <span className="text-red-400">ATK {card.attack}</span>
                      <span className="text-gray-600 mx-1">/</span>
                      <span className="text-blue-400">DEF {card.defence}</span>
                    </div>
                  )}
                  {card.type !== 'Creature' && card.effect && (
                    <div className="text-[8px] text-gray-400 text-center truncate mt-0.5">{card.effect}</div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Graveyard — right side, messy stack of card faces */}
      <div className="flex flex-col items-center gap-1">
        <div
          className="relative w-[90px] h-[126px] cursor-pointer"
          onClick={() => graveyardCount > 0 && setGraveyardOpen(true)}
        >
          {graveyard && graveyard.length > 0 ? (
            <>
              {graveyard.slice(-5).map((card, i, arr) => {
                const isTop = i === arr.length - 1;
                const rot = graveyardRotations[graveyard.length - arr.length + i] || 0;
                return (
                  <div
                    key={card.uid || i}
                    className="absolute"
                    style={{
                      top: `${-i * 0.5}px`,
                      left: `${i * 0.3}px`,
                      transform: `rotate(${rot}deg)`,
                      zIndex: i,
                    }}
                  >
                    <CardFace card={card} className={isTop ? 'shadow-md' : ''} />
                  </div>
                );
              })}
              {/* Count badge */}
              <div className="absolute -top-1 -right-1 bg-red-700 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center z-10">
                {graveyardCount}
              </div>
            </>
          ) : (
            <div className="w-[90px] h-[126px] rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center">
              <span className="text-gray-600 text-[11px]">Empty</span>
            </div>
          )}
        </div>
        <span className="text-gray-400 text-[11px]">Graveyard</span>
      </div>
    </div>
  );
}
