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
  Creature:
    "0 0 12px rgba(220, 38, 38, 0.4), 0 0 28px rgba(220, 38, 38, 0.15), inset 0 0 8px rgba(220, 38, 38, 0.1)",
  Magic:
    "0 0 12px rgba(37, 99, 235, 0.4), 0 0 28px rgba(37, 99, 235, 0.15), inset 0 0 8px rgba(37, 99, 235, 0.1)",
  Armour:
    "0 0 12px rgba(156, 163, 175, 0.3), 0 0 28px rgba(156, 163, 175, 0.1), inset 0 0 8px rgba(156, 163, 175, 0.08)",
  Tricks:
    "0 0 12px rgba(22, 163, 74, 0.4), 0 0 28px rgba(22, 163, 74, 0.15), inset 0 0 8px rgba(22, 163, 74, 0.1)",
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
    setAttackDrag,
    gameState,
    attack,
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
  const attackDragStart = useRef(null);
  const attackDragging = useRef(false);
  const isMyTurn = gameState?.currentPlayerId === gameState?.myId;

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

  // Touch handlers — own creatures support drag-to-attack
  const handleTouchStart = useCallback(
    (e) => {
      if (!isOpponent && isMyTurn && !card._hasAttacked) {
        // Track potential attack drag
        const t = e.touches[0];
        attackDragStart.current = { x: t.clientX, y: t.clientY };
        attackDragging.current = false;
      }
      longPressTimer.current = setTimeout(() => {
        if (!attackDragging.current) {
          setZoomedCard(card);
        }
        longPressTimer.current = null;
      }, 400);
    },
    [card, setZoomedCard, isOpponent, isMyTurn],
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      if (!attackDragStart.current || isOpponent) return;
      const t = e.touches[0];
      const dx = t.clientX - attackDragStart.current.x;
      const dy = t.clientY - attackDragStart.current.y;
      if (!attackDragging.current && Math.abs(dx) + Math.abs(dy) > 15) {
        attackDragging.current = true;
        selectCard({ ...card, _zone: "swamp" });
      }
      if (attackDragging.current) {
        e.preventDefault();
        const el = e.currentTarget;
        const rect = el.getBoundingClientRect();
        setAttackDrag({
          attackerUid: card.uid,
          from: {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          },
          to: { x: t.clientX, y: t.clientY },
        });
      }
    },
    [card, isOpponent, setAttackDrag, selectCard],
  );

  const handleTouchEnd = useCallback(
    (e) => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      if (attackDragging.current) {
        // Check if finger is over an opponent creature
        const t = e.changedTouches[0];
        const el = document.elementFromPoint(t.clientX, t.clientY);
        const targetCard = el?.closest("[data-card-uid]");
        if (targetCard) {
          const targetUid = targetCard.getAttribute("data-card-uid");
          // Find which opponent owns this creature
          if (gameState?.players) {
            for (const [pid, p] of Object.entries(gameState.players)) {
              if (pid === gameState.myId) continue;
              const creature = p.swamp?.find((c) => c.uid === targetUid);
              if (creature) {
                attack(card.uid, pid, creature.uid);
                break;
              }
            }
          }
        }
        // Also check for direct attack on opponent field
        const fieldEl = el?.closest("[data-opponent-field]");
        if (fieldEl && !targetCard) {
          const opponentId = fieldEl.getAttribute("data-opponent-field");
          const opponent = gameState?.players[opponentId];
          const visibleCreatures = opponent?.swamp?.filter(
            (c) => !c._invisible,
          );
          if (visibleCreatures?.length === 0) {
            attack(card.uid, opponentId, opponentId);
          }
        }
        setAttackDrag(null);
        attackDragging.current = false;
      }
      attackDragStart.current = null;
    },
    [card, gameState, attack, setAttackDrag],
  );

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
      } ${invisible ? "opacity-40" : card._hasAttacked && !isOpponent ? "grayscale-[20%]" : ""}`}
      style={
        hovered && !invisible ? { boxShadow: TYPE_GLOW[card.type] } : undefined
      }
      data-card-hover
      data-card-uid={card.uid}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchMove={isMobile ? handleTouchMove : undefined}
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
      whileHover={
        animationsOff || isMobile
          ? undefined
          : {
              scale: 1.06,
              transition: { type: "spring", stiffness: 400, damping: 22 },
            }
      }
      animate={
        animationsOff
          ? {}
          : isAttacking
            ? {
                x: [0, 6, 35, -4, 0],
                scale: [1, 1.08, 1.02, 0.98, 1],
                filter: [
                  "brightness(1)",
                  "brightness(1.3)",
                  "brightness(1.6)",
                  "brightness(1.1)",
                  "brightness(1)",
                ],
                transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
              }
            : isDefending
              ? {
                  x: [0, -5, 5, -3, 3, -1, 0],
                  scale: [1, 0.97, 1.01, 0.99, 1],
                  filter: [
                    "brightness(1)",
                    "brightness(2)",
                    "brightness(1.5)",
                    "brightness(1.2)",
                    "brightness(1)",
                  ],
                  transition: { duration: 0.35, ease: "easeOut" },
                }
              : isSelected
                ? {
                    scale: 1.06,
                    transition: { type: "spring", stiffness: 300, damping: 18 },
                  }
                : {
                    scale: 1,
                    transition: { type: "spring", stiffness: 300, damping: 22 },
                  }
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

      {/* Top vignette for name readability */}
      {!invisible && card.type === "Creature" && (
        <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none z-[1]" />
      )}
      {/* Bottom vignette for stat readability */}
      {!invisible && card.type === "Creature" && (
        <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none z-[1]" />
      )}

      {/* Has-attacked exhaustion overlay — subtle darkening with cross-hatch */}
      {card._hasAttacked && !isOpponent && !invisible && (
        <div className="absolute inset-0 bg-black/25 pointer-events-none z-[2]" />
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

      {/* Type letter + ability badges (top-left, stacked vertically) */}
      {!invisible && (
        <div
          className={`absolute left-0.5 flex flex-col items-center gap-0.5 z-10 ${
            isMobile ? "top-[21px]" : "top-[26px]"
          }`}
        >
          <div
            className={`bg-black/70 rounded-full flex items-center justify-center font-bold ${
              isMobile ? "w-3.5 h-3.5 text-[7px]" : "w-4.5 h-4.5 text-[9px]"
            }`}
          >
            {TYPE_LETTER[card.type]}
          </div>
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
        </div>
      )}

      {/* Status indicators (top right) */}
      {card._silenced && (
        <div
          className={`absolute top-0.5 right-0.5 bg-red-800 text-white px-1 rounded z-10 ${isMobile ? "text-[6px]" : "text-[8px]"}`}
        >
          {ICONS.muted}
        </div>
      )}
      {card._stonerShield && !card._silenced && (
        <div
          className={`absolute top-0.5 right-0.5 bg-green-800 text-white px-1 rounded z-10 ${isMobile ? "text-[6px]" : "text-[8px]"}`}
        >
          {ICONS.shield}
        </div>
      )}

      {/* Creature name -- at top of card */}
      {!invisible && card.type === "Creature" && (
        <div
          className={`absolute left-0 right-0 top-0 text-center font-bold truncate px-1 z-[3] ${
            isSelected
              ? "bg-[var(--color-gold)]/20 text-[var(--color-gold-bright)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
              : "bg-gradient-to-r from-black/50 via-black/70 to-black/50 text-gray-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
          } ${isMobile ? "text-[7px] py-0.5" : "text-[9px] py-0.5"}`}
        >
          {card.name}
        </div>
      )}
      {/* Selected non-creature name overlay */}
      {isSelected && !invisible && card.type !== "Creature" && (
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
              ? "bottom-[20px] text-[7px] py-0"
              : "bottom-[24px] text-[9px] py-0.5"
          } ${prediction.kills ? "bg-green-900/90 text-green-300" : "bg-yellow-900/90 text-yellow-300"}`}
        >
          {prediction.kills
            ? `${prediction.atk} vs ${prediction.def} — Kill!`
            : `${prediction.atk} vs ${prediction.def} — ${prediction.atk} dmg`}
        </div>
      )}

      {/* Health bar below name at top */}
      {!invisible && card.type === "Creature" && (
        <div
          className={`absolute left-0 right-0 z-[3] ${isMobile ? "top-[16px]" : "top-[20px]"}`}
        >
          <div className={`${isMobile ? "h-[3px]" : "h-[4px]"} bg-gray-900/60`}>
            <div
              className={`h-full ${defColor} transition-all duration-500 ease-out relative`}
              style={{ width: `${defPct}%` }}
            >
              <div className="absolute top-0 right-0 w-1 h-full bg-white/20 rounded-r" />
            </div>
          </div>
        </div>
      )}

      {/* Stats at bottom */}
      {!invisible && card.type === "Creature" && (
        <div className="absolute bottom-0 left-0 right-0">
          <div
            className={`bg-gradient-to-t from-black/90 to-black/75 grid grid-cols-3 ${isMobile ? (effectiveAtk >= 1000 || currentDef >= 1000 || (card.sp ?? 0) >= 1000 ? "text-[7px]" : "text-[9px]") + " py-0.5" : "text-[12px] py-0.5"}`}
          >
            <span
              className={`font-bold text-center transition-all duration-300 ${atkGlow ? "text-yellow-300 animate-pulse drop-shadow-[0_0_6px_rgba(253,224,71,0.8)] scale-110" : card._attackBuff ? "text-orange-400" : "text-red-400"}`}
            >
              {ICONS.swords}
              <br />
              {effectiveAtk}
            </span>
            <span
              className={`font-bold text-center transition-all duration-300 ${defGlow ? "text-cyan-300 animate-pulse drop-shadow-[0_0_6px_rgba(103,232,249,0.8)] scale-110" : card._defenceDamage ? "text-red-400" : isBuffed ? "text-cyan-400" : "text-blue-400"}`}
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
        </div>
      )}
    </motion.div>
  );
}
