import { useMemo, useState } from "react";
import { useStore } from "../../store.js";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import VolcanoModal from "../ui/VolcanoModal.jsx";
import JargonModal from "../ui/JargonModal.jsx";

const TYPE_BORDER = {
  Creature: "border-red-600",
  Magic: "border-blue-600",
  Armour: "border-gray-500",
  Tricks: "border-green-600",
};

function getDeckRotations(count) {
  const rotations = [];
  for (let i = 0; i < Math.min(count, 6); i++) {
    rotations.push(Math.sin(i * 7.3 + 2.1) * 2);
  }
  return rotations;
}

function CardFace({ card, className = "", style = {}, small, isMobile }) {
  const w = small ? (isMobile ? "w-[63px]" : "w-[107px]") : "w-[90px]";
  const h = small ? (isMobile ? "h-[88px]" : "h-[150px]") : "h-[126px]";
  return (
    <div
      className={`${w} ${h} rounded-lg border-2 overflow-hidden ${
        TYPE_BORDER[card.type] || "border-gray-600"
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

function CardBack({ className = "", style = {}, small, isMobile }) {
  const w = small ? (isMobile ? "w-[63px]" : "w-[107px]") : "w-[90px]";
  const h = small ? (isMobile ? "h-[88px]" : "h-[150px]") : "h-[126px]";
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

export default function CenterZone({
  deckCount,
  graveyardCount,
  graveyard,
  stagedCards = [],
  volcano,
  dragon,
  jargon,
}) {
  const { setGraveyardOpen, selectedCard, attackEvent, gameState } = useStore();
  const isMobile = useIsMobile();
  const [volcanoOpen, setVolcanoOpen] = useState(false);
  const [jargonOpen, setJargonOpen] = useState(false);

  const isMyTurn = gameState?.currentPlayerId === gameState?.myId;
  const canAttackDragon =
    dragon?.active &&
    isMyTurn &&
    selectedCard &&
    selectedCard._zone === "swamp" &&
    !selectedCard._hasAttacked;

  const graveyardRotations = useMemo(() => {
    return (graveyard || []).map((_, i) => Math.sin(i * 5.7 + 1.3) * 8);
  }, [graveyard?.length]);

  const deckRotations = useMemo(() => getDeckRotations(deckCount), [deckCount]);

  // Match creature card sizes in the swamp
  const cardW = isMobile ? 63 : 107;
  const cardH = isMobile ? 88 : 150;
  const layoutW = cardW;
  const layoutH = cardH;
  const zoneH = isMobile ? "h-[115px]" : "h-[175px]";

  return (
    <div
      className={`flex-shrink-0 ${zoneH} flex items-center justify-between px-4 md:px-12 lg:px-24 relative`}
    >
      {/* Subtle divider line */}
      <div className="absolute left-4 right-4 md:left-12 md:right-12 lg:left-24 lg:right-24 top-0 h-px bg-gradient-to-r from-transparent via-gray-700/30 to-transparent" />
      <div className="absolute left-4 right-4 md:left-12 md:right-12 lg:left-24 lg:right-24 bottom-0 h-px bg-gradient-to-r from-transparent via-gray-700/30 to-transparent" />
      {/* Deck stack — left side */}
      <div className="flex flex-col items-center gap-1">
        <span
          className={`text-gray-500 font-display ${isMobile ? "text-[14px]" : "text-[16px]"}`}
        >
          Deck {deckCount}
        </span>
        <div className="relative" style={{ width: layoutW, height: layoutH }}>
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
                    <CardBack
                      small
                      isMobile={isMobile}
                      className="border-[var(--color-gold)]/40 shadow-none"
                    />
                  </div>
                );
              })}
              <div
                className="absolute"
                style={{
                  top: "0px",
                  left: "0px",
                  transform: `rotate(${deckRotations[deckRotations.length - 1] || 0}deg)`,
                }}
              >
                <CardBack small isMobile={isMobile} />
              </div>
            </>
          ) : (
            <div
              className="rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center"
              style={{ width: cardW, height: cardH }}
            >
              <span className="text-gray-600 text-[11px]">Empty</span>
            </div>
          )}
        </div>
      </div>

      {/* Staged card stack — center, Uno-style */}
      {stagedCards.length > 0 && (
        <div
          className="relative z-10"
          style={{
            width: isMobile ? 70 : 80,
            height: isMobile ? 98 : 112,
            overflow: "visible",
          }}
        >
          <div
            style={{
              transform: isMobile ? "scale(0.85)" : "scale(0.7)",
              transformOrigin: "center center",
            }}
          >
            <div
              className="relative"
              style={{
                width: isMobile ? 82 : 110,
                height: isMobile ? 115 : 154,
              }}
            >
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
                      TYPE_BORDER[card.type] || "border-gray-600"
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

      {/* Event zone — Volcano, Dragon, Jargon */}
      {(volcano?.active || dragon?.active || jargon?.active) && (
        <div className="flex items-center gap-2 z-10">
          {/* Volcano */}
          {volcano?.active && !dragon?.active && (
            <button
              onClick={() => setVolcanoOpen(true)}
              className={`relative flex flex-col items-center rounded-lg bg-orange-900/40 border border-orange-600/50 hover:bg-orange-900/60 transition cursor-pointer ${
                isMobile ? "px-3 py-2" : "px-2 py-1"
              }`}
              title="Volcano Bank"
            >
              <span className={`text-xl ${isMobile ? "text-base" : ""}`}>
                &#x1F30B;
              </span>
              <span className="text-[9px] text-orange-300 font-bold">
                {volcano.totalBanked} SP
              </span>
            </button>
          )}

          {/* Dragon — click to attack with selected creature */}
          {dragon?.active && (
            <div
              className={`relative flex flex-col items-center px-2 py-1 rounded-lg bg-red-900/50 border border-red-500/60 animate-pulse ${
                canAttackDragon
                  ? "cursor-pointer ring-2 ring-[var(--color-gold)] hover:bg-red-900/80"
                  : ""
              }`}
              onClick={() => {
                if (canAttackDragon) attackEvent(selectedCard.uid);
              }}
              title={canAttackDragon ? "Click to attack the Dragon!" : "Dragon"}
            >
              <span className={`text-xl ${isMobile ? "text-base" : ""}`}>
                &#x1F409;
              </span>
              <div className="w-16 h-1.5 bg-gray-800 rounded-full mt-0.5 overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all"
                  style={{
                    width: `${(dragon.currentHP / dragon.maxHP) * 100}%`,
                  }}
                />
              </div>
              <span className="text-[8px] text-red-300">
                {dragon.currentHP}/{dragon.maxHP}
              </span>
              {canAttackDragon && (
                <span className="text-[8px] text-[var(--color-gold)] font-bold mt-0.5">
                  TAP TO ATTACK
                </span>
              )}
              {volcano?.totalBanked > 0 && (
                <span className="text-[8px] text-orange-300">
                  &#x1F30B; {volcano.totalBanked} SP
                </span>
              )}
            </div>
          )}

          {/* Jargon */}
          {jargon?.active && (
            <button
              onClick={() => setJargonOpen(true)}
              className={`relative flex flex-col items-center rounded-lg bg-purple-900/40 border border-purple-500/50 hover:bg-purple-900/60 transition cursor-pointer ${
                isMobile ? "px-3 py-2" : "px-2 py-1"
              }`}
              title="Jargon the Vendor"
            >
              <span className={`text-xl ${isMobile ? "text-base" : ""}`}>
                &#x1F9D9;
              </span>
              <span className="text-[9px] text-purple-300 font-bold">Shop</span>
            </button>
          )}
        </div>
      )}

      {/* Graveyard — right side, messy stack of card faces */}
      <div className="flex flex-col items-center gap-1">
        <span
          className={`text-gray-500 font-display ${isMobile ? "text-[14px]" : "text-[16px]"}`}
        >
          Grave
        </span>
        <div
          className="relative cursor-pointer"
          style={{ width: layoutW, height: layoutH }}
          onClick={() => graveyardCount > 0 && setGraveyardOpen(true)}
        >
          {graveyard && graveyard.length > 0 ? (
            <>
              {graveyard.slice(isMobile ? -3 : -5).map((card, i, arr) => {
                const isTop = i === arr.length - 1;
                const rot =
                  graveyardRotations[graveyard.length - arr.length + i] || 0;
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
                    <CardFace
                      card={card}
                      small
                      isMobile={isMobile}
                      className={isTop ? "shadow-md" : ""}
                    />
                  </div>
                );
              })}
              {/* Count badge */}
              <div className="absolute -top-2 -right-2 bg-red-700 text-white text-[14px] font-bold w-7 h-7 rounded-full flex items-center justify-center z-10">
                {graveyardCount}
              </div>
            </>
          ) : (
            <div
              className="rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center"
              style={{ width: cardW, height: cardH }}
            >
              <span className="text-gray-600 text-[11px]">Empty</span>
            </div>
          )}
        </div>
      </div>

      {/* Event modals */}
      {volcanoOpen && volcano && (
        <VolcanoModal volcano={volcano} onClose={() => setVolcanoOpen(false)} />
      )}
      {jargonOpen && jargon?.active && (
        <JargonModal
          graveyardCount={graveyardCount}
          onClose={() => setJargonOpen(false)}
        />
      )}
    </div>
  );
}
