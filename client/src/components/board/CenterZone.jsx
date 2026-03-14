import { useMemo } from 'react';
import { useStore } from '../../store.js';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '../../hooks/useIsMobile.js';

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

function CardFace({ card, className = '', style = {}, small }) {
  const w = small ? 'w-[60px]' : 'w-[90px]';
  const h = small ? 'h-[84px]' : 'h-[126px]';
  return (
    <div
      className={`${w} ${h} rounded-lg border-2 overflow-hidden ${
        TYPE_BORDER[card.type] || 'border-gray-600'
      } ${className}`}
      style={style}
    >
      {card.image ? (
        <img
          src={`/cards/${card.image}`}
          alt={card.name}
          className="w-full h-[155%] object-cover object-top"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full bg-gray-800" />
      )}
    </div>
  );
}

function CardBack({ className = '', style = {}, small }) {
  const w = small ? 'w-[60px]' : 'w-[90px]';
  const h = small ? 'h-[84px]' : 'h-[126px]';
  return (
    <div
      className={`${w} ${h} rounded-lg border-2 border-[var(--color-gold)] overflow-hidden shadow-lg ${className}`}
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
  const isMobile = useIsMobile();

  const graveyardRotations = useMemo(() => {
    return (graveyard || []).map((_, i) => Math.sin(i * 5.7 + 1.3) * 8);
  }, [graveyard?.length]);

  const deckRotations = useMemo(() => getDeckRotations(deckCount), [deckCount]);

  const cardW = isMobile ? 60 : 90;
  const cardH = isMobile ? 84 : 126;
  // On mobile, scale the card stacks down to save vertical space
  const mobileScale = 0.5;
  // Scaled dimensions for layout reservations on mobile
  const layoutW = isMobile ? Math.round(cardW * mobileScale) : cardW;
  const layoutH = isMobile ? Math.round(cardH * mobileScale) : cardH;
  const zoneH = isMobile ? 'h-[52px]' : 'h-[140px]';

  return (
    <div className={`flex-shrink-0 ${zoneH} flex items-center justify-between px-4 md:px-12 lg:px-24 relative`}>
      {/* Deck stack — left side */}
      <div className={`flex ${isMobile ? 'flex-row items-center gap-1' : 'flex-col items-center gap-1'}`}>
        <div className="relative" style={{ width: layoutW, height: layoutH }}>
          <div style={isMobile ? { transform: `scale(${mobileScale})`, transformOrigin: 'top left' } : undefined}>
            <div className="relative" style={{ width: cardW, height: cardH }}>
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
                        <CardBack small className="border-[var(--color-gold)]/40 shadow-none" />
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
                    <CardBack small />
                  </div>
                </>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center" style={{ width: cardW, height: cardH }}>
                  <span className="text-gray-600 text-[11px]">Empty</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <span className={`text-gray-400 ${isMobile ? 'text-[9px]' : 'text-[11px]'}`}>{deckCount}</span>
      </div>

      {/* Staged card stack — center, Uno-style */}
      {stagedCards.length > 0 && (
        <div className="relative z-10" style={{ width: isMobile ? 50 : 110, height: isMobile ? 70 : 154 }}>
          <div style={isMobile ? { transform: `scale(${mobileScale + 0.15})`, transformOrigin: 'center center' } : undefined}>
            <div className="relative" style={{ width: isMobile ? 72 : 110, height: isMobile ? 100 : 154 }}>
              <AnimatePresence>
                {stagedCards.map((card) => (
                  <motion.div
                    key={card._stagedId}
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -10 }}
                    transition={{ duration: 0.3 }}
                    style={{ rotate: `${card._rotation}deg` }}
                    className={`absolute inset-0 rounded-lg border-2 overflow-hidden shadow-2xl flex flex-col ${
                      TYPE_BORDER[card.type] || 'border-gray-600'
                    }`}
                  >
                    {card.image ? (
                      <img
                        src={`/cards/${card.image}`}
                        alt={card.name}
                        className="w-full h-[155%] object-cover object-top"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800" />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* Graveyard — right side, messy stack of card faces */}
      <div className={`flex ${isMobile ? 'flex-row-reverse items-center gap-1' : 'flex-col items-center gap-1'}`}>
        <div
          className="relative cursor-pointer"
          style={{ width: layoutW, height: layoutH }}
          onClick={() => graveyardCount > 0 && setGraveyardOpen(true)}
        >
          <div style={isMobile ? { transform: `scale(${mobileScale})`, transformOrigin: 'top left' } : undefined}>
            <div className="relative" style={{ width: cardW, height: cardH }}>
              {graveyard && graveyard.length > 0 ? (
                <>
                  {graveyard.slice(isMobile ? -3 : -5).map((card, i, arr) => {
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
                        <CardFace card={card} small className={isTop ? 'shadow-md' : ''} />
                      </div>
                    );
                  })}
                  {/* Count badge */}
                  <div className="absolute -top-1 -right-1 bg-red-700 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center z-10">
                    {graveyardCount}
                  </div>
                </>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center" style={{ width: cardW, height: cardH }}>
                  <span className="text-gray-600 text-[11px]">Empty</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <span className={`text-gray-400 ${isMobile ? 'text-[9px]' : 'text-[11px]'}`}>Grave</span>
      </div>
    </div>
  );
}
