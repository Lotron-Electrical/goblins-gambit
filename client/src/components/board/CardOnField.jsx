import { useState, useRef, useCallback, useEffect } from "react";
import { useStore } from "../../store.js";
import { motion } from "framer-motion";
import { ICONS, TYPE_ICON } from "../ui/icons.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";

const TYPE_BORDER = {
  Creature: "border-red-600",
  Magic: "border-blue-600",
  Armour: "border-gray-500",
  Tricks: "border-green-600",
};

const TYPE_LETTER = { Creature: "C", Magic: "M", Armour: "A", Tricks: "T" };

const TYPE_GLOW = {
  Creature: "0 0 20px rgba(220, 38, 38, 0.5)",
  Magic: "0 0 20px rgba(37, 99, 235, 0.5)",
  Armour: "0 0 20px rgba(107, 114, 128, 0.5)",
  Tricks: "0 0 20px rgba(22, 163, 74, 0.5)",
};

export default function CardOnField({
  card,
  isOpponent,
  onClick,
  isValidTarget,
  isAttacking,
  isDefending,
  prediction,
}) {
  const {
    selectedCard,
    selectCard,
    setZoomedCard,
    setHoveredCard,
    clearHoveredCard,
    animationsOff,
    tutorialEngine,
  } = useStore();
  const [hovered, setHovered] = useState(false);
  const isSelected = selectedCard?.uid === card.uid;
  const invisible = card._invisible;
  const isMobile = useIsMobile();
  // Tutorial: highlight opponent creature as attack target (show before and after selecting attacker)
  const tutConfig = tutorialEngine ? tutorialEngine.getStepConfig() : null;
  const isTutorialAttackTarget =
    isOpponent && tutConfig?.expectedAction === "attack";
  const longPressTimer = useRef(null);

  const handleClick = () => {
    if (isOpponent) {
      onClick?.();
    } else {
      selectCard({ ...card, _zone: "swamp" });
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setZoomedCard(card);
  };

  // Long-press to zoom on mobile
  const handleTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setZoomedCard(card);
      longPressTimer.current = null;
    }, 400);
  }, [card, setZoomedCard]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Swapeewee: when _swapped, ATK and DEF base values are flipped
  const isSwapped = card.abilityId === "swapeewee_swap" && card._swapped;
  const baseAtk = isSwapped ? card.defence || 0 : card.attack || 0;
  const baseDef = isSwapped ? card.attack || 0 : card.defence || 0;

  // Calculate effective stats
  const effectiveAtk = baseAtk + (card._attackBuff || 0);
  const currentDef = Math.max(
    0,
    baseDef -
      (card._defenceDamage || 0) +
      (card._defenceBuff || 0) +
      (card._tempShield || 0),
  );

  // Glow when stats change from buffs
  const [atkGlow, setAtkGlow] = useState(false);
  const [defGlow, setDefGlow] = useState(false);
  const prevAtkBuff = useRef(card._attackBuff || 0);
  const prevDefBuff = useRef(
    (card._defenceBuff || 0) + (card._tempShield || 0),
  );

  useEffect(() => {
    const curAtkBuff = card._attackBuff || 0;
    const curDefBuff = (card._defenceBuff || 0) + (card._tempShield || 0);
    if (curAtkBuff > prevAtkBuff.current) {
      setAtkGlow(true);
      setTimeout(() => setAtkGlow(false), 1500);
    }
    if (curDefBuff > prevDefBuff.current) {
      setDefGlow(true);
      setTimeout(() => setDefGlow(false), 1500);
    }
    prevAtkBuff.current = curAtkBuff;
    prevDefBuff.current = curDefBuff;
  }, [card._attackBuff, card._defenceBuff, card._tempShield]);
  const effectiveMax = Math.max(baseDef || 1, currentDef);
  const defPct = Math.min(100, (currentDef / effectiveMax) * 100);
  const isBuffed = currentDef > (baseDef || 1);
  const defColor = isBuffed
    ? "bg-cyan-400"
    : defPct > 60
      ? "bg-green-500"
      : defPct > 30
        ? "bg-yellow-500"
        : "bg-red-500";

  const w = "w-full";
  const h = isMobile ? "h-[88px]" : "h-[150px]";

  return (
    <motion.div
      className={`relative ${w} ${h} rounded-lg border-2 cursor-pointer overflow-hidden ${
        TYPE_BORDER[card.type] || "border-gray-600"
      } ${isSelected ? "ring-2 ring-[var(--color-gold)] animate-sparkle-border" : ""} ${
        isValidTarget ? "ring-2 ring-red-400 animate-pulse" : ""
      } ${invisible ? "opacity-40" : card._hasAttacked && !isOpponent ? "opacity-50" : ""}`}
      style={
        hovered && !invisible ? { boxShadow: TYPE_GLOW[card.type] } : undefined
      }
      data-card-hover
      data-card-uid={card.uid}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
      onTouchCancel={isMobile ? handleTouchEnd : undefined}
      onMouseEnter={
        isMobile
          ? undefined
          : (e) => {
              setHovered(true);
              setHoveredCard(card, {
                x: e.clientX,
                y: e.clientY,
                zone: "field",
              });
            }
      }
      onMouseMove={
        isMobile
          ? undefined
          : (e) =>
              setHoveredCard(card, {
                x: e.clientX,
                y: e.clientY,
                zone: "field",
              })
      }
      onMouseLeave={
        isMobile
          ? undefined
          : () => {
              setHovered(false);
              clearHoveredCard();
            }
      }
      whileHover={animationsOff || isMobile ? undefined : { scale: 1.05 }}
      animate={
        animationsOff
          ? {}
          : isAttacking
            ? { x: [0, 30, 0], transition: { duration: 0.35 } }
            : isDefending
              ? {
                  x: [0, -3, 3, -2, 2, 0],
                  filter: [
                    "brightness(1)",
                    "brightness(1.8)",
                    "brightness(1.4)",
                    "brightness(1)",
                  ],
                  transition: { duration: 0.3 },
                }
              : isSelected
                ? { scale: 1.05 }
                : {}
      }
      layout
    >
      {/* Card art — cropped to artwork only, hiding text portion */}
      {card.image && !invisible && (
        <img
          src={`/cards/${card.image}`}
          alt={card.name}
          className="absolute inset-0 w-full h-[155%] object-cover object-top"
          draggable={false}
        />
      )}

      {/* Invisible overlay */}
      {invisible && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <span
            className={`text-gray-500 ${isMobile ? "text-[10px]" : "text-[12px]"}`}
          >
            ???
          </span>
        </div>
      )}

      {/* Tutorial: red attack target indicator */}
      {isTutorialAttackTarget && (
        <div className="absolute inset-0 z-20 pointer-events-none rounded-lg ring-2 ring-red-500 animate-pulse">
          {selectedCard && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-red-500 rounded-full animate-ping opacity-40" />
            </div>
          )}
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <div className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg animate-bounce">
              {selectedCard ? "Tap to attack!" : "Target"}
            </div>
          </div>
        </div>
      )}

      {/* Type letter badge */}
      {!invisible && (
        <div
          className={`absolute top-0.5 right-0.5 flex items-center gap-0.5 z-10 ${
            isMobile ? "" : ""
          }`}
        >
          {card.abilityId && (
            <div
              className={`bg-yellow-600/80 rounded-full flex items-center justify-center ${
                isMobile ? "w-3 h-3" : "w-4 h-4"
              }`}
            >
              <span className={isMobile ? "text-[6px]" : "text-[8px]"}>
                {ICONS.lightning}
              </span>
            </div>
          )}
          <div
            className={`bg-black/70 rounded-full flex items-center justify-center font-bold ${
              isMobile ? "w-3.5 h-3.5 text-[7px]" : "w-4.5 h-4.5 text-[9px]"
            }`}
          >
            {TYPE_LETTER[card.type]}
          </div>
        </div>
      )}

      {/* Status indicators (top left) */}
      {card._silenced && (
        <div
          className={`absolute top-0.5 left-0.5 bg-red-800 text-white px-1 rounded ${isMobile ? "text-[6px]" : "text-[8px]"}`}
        >
          {ICONS.muted}
        </div>
      )}
      {card._stonerShield && !card._silenced && (
        <div
          className={`absolute top-0.5 left-0.5 bg-green-800 text-white px-1 rounded ${isMobile ? "text-[6px]" : "text-[8px]"}`}
        >
          {ICONS.shield}
        </div>
      )}

      {/* Selected card name overlay */}
      {isSelected && !invisible && (
        <div
          className={`absolute top-1/2 left-0 right-0 -translate-y-1/2 bg-black/70 text-[var(--color-gold-bright)] text-center font-bold truncate px-0.5 ${
            isMobile ? "text-[7px] py-0" : "text-[9px] py-0.5"
          }`}
        >
          {card.name}
        </div>
      )}

      {/* Damage prediction overlay */}
      {prediction && (
        <div
          className={`absolute left-0 right-0 z-20 text-center font-bold ${
            isMobile
              ? "bottom-[22px] text-[7px] py-0"
              : "bottom-[26px] text-[9px] py-0.5"
          } ${prediction.kills ? "bg-green-900/90 text-green-300" : "bg-yellow-900/90 text-yellow-300"}`}
        >
          {prediction.kills
            ? `${prediction.atk} vs ${prediction.def} — Kill!`
            : `${prediction.atk} vs ${prediction.def} — ${prediction.atk} dmg`}
        </div>
      )}

      {/* Stats + health bar at bottom */}
      {!invisible && card.type === "Creature" && (
        <div className="absolute bottom-0 left-0 right-0">
          <div
            className={`bg-black/80 grid grid-cols-3 ${isMobile ? "text-[9px] py-0.5" : "text-[12px] py-0.5"}`}
          >
            <span
              className={`font-bold text-center ${atkGlow ? "text-yellow-300 animate-pulse drop-shadow-[0_0_6px_rgba(253,224,71,0.8)]" : "text-red-400"}`}
            >
              {ICONS.swords}
              <br />
              {effectiveAtk}
            </span>
            <span
              className={`font-bold text-center ${defGlow ? "text-cyan-300 animate-pulse drop-shadow-[0_0_6px_rgba(103,232,249,0.8)]" : card._defenceDamage ? "text-red-400" : "text-blue-400"}`}
            >
              {ICONS.shield}
              <br />
              {currentDef}
            </span>
            <span className="text-yellow-400 font-bold text-center">
              {ICONS.coin}
              <br />
              {card.sp ?? 0}
            </span>
          </div>
          <div className="h-[3px]">
            <div
              className={`h-full ${defColor} transition-all duration-300`}
              style={{ width: `${defPct}%` }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
