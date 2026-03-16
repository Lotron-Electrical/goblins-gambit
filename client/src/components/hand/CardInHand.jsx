import { useRef, useCallback, useState } from "react";
import { useStore } from "../../store.js";
import { motion } from "framer-motion";
import { ICONS, TYPE_ICON } from "../ui/icons.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { THEME_EFFECTS } from "../../../../shared/src/constants.js";
import { soundManager } from "../../audio/SoundManager.js";

const TYPE_BORDER = {
  Creature: "border-red-600 hover:border-red-400",
  Magic: "border-blue-600 hover:border-blue-400",
  Armour: "border-gray-500 hover:border-gray-300",
  Tricks: "border-green-600 hover:border-green-400",
};

// Type-colored glow class for hover state
const TYPE_HOVER_GLOW = {
  Creature: "animate-glow-red",
  Magic: "animate-glow-blue",
  Armour: "animate-glow-gray",
  Tricks: "animate-glow-green",
};

// Border style by type (visual differentiation beyond colour)
const TYPE_BORDER_STYLE = {
  Creature: "border-solid",
  Magic: "border-dashed",
  Armour: "border-double",
  Tricks: "border-dotted",
};

const TYPE_LETTER = { Creature: "C", Magic: "M", Armour: "A", Tricks: "T" };
const REACTION_ABILITIES = ["stfu_silence", "lagg_delay"];

// Type-colored border for collapsed strip cards
const TYPE_COLOR_SOLID = {
  Creature: "border-red-500",
  Magic: "border-blue-500",
  Armour: "border-gray-400",
  Tricks: "border-green-500",
};

export default function CardInHand({
  card,
  isSelected,
  variant,
  onSelect,
  disableTouch,
}) {
  const {
    selectCard,
    playCard,
    gameState,
    setZoomedCard,
    setHoveredCard,
    clearHoveredCard,
    animationsOff,
    tutorialEngine,
    setDraggingCard,
    setDragPosition,
  } = useStore();
  const tutStepConfig = tutorialEngine ? tutorialEngine.getStepConfig() : null;
  const isTutorialHighlight = tutStepConfig?.highlightCardUid === card.uid;
  const isTutorialBlocked =
    tutorialEngine && tutStepConfig?.highlightCardUid && !isTutorialHighlight;
  const isMyTurn = gameState?.currentPlayerId === gameState?.myId;
  const isReaction = REACTION_ABILITIES.includes(card.abilityId);
  const isMobile = useIsMobile();
  const longPressTimer = useRef(null);

  // Tutorial wrong-card toast state (must be before early returns for hook rules)
  const [showWrongToast, setShowWrongToast] = useState(false);
  const wrongToastTimer = useRef(null);
  const [hovered, setHovered] = useState(false);

  // Desktop drag-to-field for creatures
  const dragStartPos = useRef(null);
  const handleMouseDown = useCallback(
    (e) => {
      if (isMobile || card.type !== "Creature") return;
      if (!isMyTurn && !isReaction) return;
      dragStartPos.current = { x: e.clientX, y: e.clientY };

      const onMouseMove = (me) => {
        if (!dragStartPos.current) return;
        const dx = me.clientX - dragStartPos.current.x;
        const dy = me.clientY - dragStartPos.current.y;
        if (Math.abs(dx) + Math.abs(dy) > 10) {
          setDraggingCard(card);
          setDragPosition({ x: me.clientX, y: me.clientY });
          dragStartPos.current = null;
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);
        }
      };

      const onMouseUp = () => {
        dragStartPos.current = null;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [isMobile, card, isMyTurn, isReaction, setDraggingCard, setDragPosition],
  );

  // Collapsed variant — minimal strip card, no interaction
  if (isMobile && variant === "collapsed") {
    return (
      <div
        className={`w-[28px] h-[30px] rounded-sm border-2 ${TYPE_COLOR_SOLID[card.type] || "border-gray-600"} bg-gray-900 flex items-center justify-center shrink-0`}
        style={{ marginRight: "-20px" }}
      >
        <span className="text-[9px] font-bold text-gray-300">
          {TYPE_LETTER[card.type]}
        </span>
      </div>
    );
  }

  const handleClick = () => {
    // Block interaction with non-highlighted cards during tutorial
    if (isTutorialBlocked) {
      // Show brief "wrong card" feedback
      setShowWrongToast(true);
      if (wrongToastTimer.current) clearTimeout(wrongToastTimer.current);
      wrongToastTimer.current = setTimeout(
        () => setShowWrongToast(false),
        1200,
      );
      return;
    }
    if (!isMyTurn && !isReaction) return;
    // Row variant: tap to select (calls onSelect), not the store selectCard
    if (isMobile && variant === "row") {
      soundManager.play("card_tick");
      onSelect?.(card);
      return;
    }
    // Popup variant: tap to play (non-creatures)
    if (isMobile && variant === "popup") {
      if (card.type === "Creature") return;
      playCard(card.uid);
      return;
    }
    if (isSelected || (!isMyTurn && isReaction)) {
      // Creatures are placed via swamp slot click, not double-click
      if (card.type === "Creature") return;
      playCard(card.uid);
    } else {
      soundManager.play("card_tick");
      selectCard(card);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setZoomedCard(card);
  };

  // Long-press to zoom on mobile
  // Row variant skips long-press zoom (centred card auto-selects instead)
  const handleTouchStart = useCallback(
    (e) => {
      if (variant !== "row") {
        longPressTimer.current = setTimeout(() => {
          setZoomedCard(card);
          longPressTimer.current = null;
        }, 400);
      }
    },
    [card, setZoomedCard, variant],
  );

  const handleTouchMove = useCallback(() => {
    // Cancel long-press on any movement (scrolling, swiping)
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Compute effective cost with theme modifiers (Blood Moon 2x spells, Frost free spells)
  const themeEffects = THEME_EFFECTS[gameState?.theme] || THEME_EFFECTS.swamp;
  const effectiveCost =
    card.type === "Magic" && themeEffects.spellCostMultiplier !== undefined
      ? Math.floor(card.cost * themeEffects.spellCostMultiplier)
      : card.cost;
  const costModified = effectiveCost !== card.cost;
  const costText = effectiveCost === 0 ? "FREE" : `${effectiveCost} AP`;
  const canAfford =
    (isMyTurn || isReaction) &&
    (effectiveCost === 0 ||
      gameState?.players[gameState.myId]?.ap >= effectiveCost);

  const sizeByVariant =
    isMobile && variant === "popup"
      ? { w: "w-[160px]", h: "h-[224px]", textScale: "" }
      : isMobile && variant === "row"
        ? { w: "w-[90px]", h: "h-[126px]", textScale: "mobile-row" }
        : isMobile
          ? { w: "w-[72px]", h: "h-[100px]", textScale: "" }
          : { w: "w-[130px]", h: "h-[182px]", textScale: "" };
  const w = sizeByVariant.w;
  const h = sizeByVariant.h;
  const isRowOrPopup = isMobile && (variant === "row" || variant === "popup");

  return (
    <motion.div
      className={`relative ${w} ${h} rounded-lg border-2 cursor-pointer shrink-0 overflow-hidden bg-gray-900 transition-[border-color] duration-200 ${
        TYPE_BORDER[card.type] || "border-gray-600"
      } ${TYPE_BORDER_STYLE[card.type] || ""} ${
        isSelected
          ? "ring-2 ring-[var(--color-gold)] z-10 animate-sparkle-border"
          : ""
      } ${!canAfford && !isRowOrPopup ? "opacity-50" : ""} ${
        isTutorialHighlight && !isSelected
          ? "border-[var(--color-gold)] shadow-[0_0_12px_rgba(212,175,55,0.6)]"
          : ""
      } ${hovered && !isMobile && !animationsOff ? `${TYPE_HOVER_GLOW[card.type] || ""} card-shimmer-active` : ""}`}
      data-card-hover
      data-card-uid={card.uid}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseDown={!isMobile ? handleMouseDown : undefined}
      onTouchStart={isMobile && !disableTouch ? handleTouchStart : undefined}
      onTouchMove={isMobile && !disableTouch ? handleTouchMove : undefined}
      onTouchEnd={isMobile && !disableTouch ? handleTouchEnd : undefined}
      onTouchCancel={isMobile && !disableTouch ? handleTouchEnd : undefined}
      onMouseEnter={
        isMobile
          ? undefined
          : (e) => {
              setHovered(true);
              setHoveredCard(card, {
                x: e.clientX,
                y: e.clientY,
                zone: "hand",
              });
            }
      }
      onMouseMove={
        isMobile
          ? undefined
          : (e) =>
              setHoveredCard(card, { x: e.clientX, y: e.clientY, zone: "hand" })
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
              y: -16,
              scale: 1.08,
              zIndex: 50,
              transition: { type: "spring", stiffness: 400, damping: 20 },
            }
      }
      animate={
        animationsOff
          ? {}
          : isSelected
            ? {
                y: isMobile ? -6 : -14,
                scale: isMobile ? 1.02 : 1.07,
                transition: { type: "spring", stiffness: 300, damping: 18 },
              }
            : {
                y: 0,
                scale: 1,
                transition: { type: "spring", stiffness: 300, damping: 22 },
              }
      }
    >
      {/* Shimmer overlay for hover effect */}
      <div className="card-shimmer-overlay" />

      {/* Card art — cropped to artwork only, hiding text portion */}
      {card.image && (
        <img
          src={`/cards/${card.image}`}
          alt={card.name}
          className="absolute inset-0 w-full h-[155%] object-cover object-top"
          draggable={false}
        />
      )}

      {/* Bottom vignette for stat readability */}
      {card.type === "Creature" && (
        <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none z-[1]" />
      )}

      {/* Badge stack — left side for row/popup to avoid overlap bleed, right side for desktop */}
      {/* Type letter badge */}
      <div
        className={`absolute top-0.5 left-0.5 bg-black/70 rounded-full flex items-center justify-center z-10 font-bold ${
          isRowOrPopup
            ? "text-[10px] w-5 h-5"
            : isMobile
              ? "text-[9px] w-4 h-4"
              : "text-[12px] w-6 h-6"
        }`}
      >
        {TYPE_LETTER[card.type]}
      </div>

      {/* Cost badge — stacked below type on left for row/popup, top-right for desktop */}
      <div
        className={`absolute font-bold px-1 py-0.5 rounded z-10 ${
          isRowOrPopup
            ? "top-6 left-0.5 text-[10px] px-1"
            : isMobile
              ? "top-0.5 right-0.5 text-[8px]"
              : "top-0.5 right-0.5 text-[12px] px-1.5"
        } ${effectiveCost === 0 ? "bg-green-700 text-white" : costModified && effectiveCost > card.cost ? "bg-red-800 text-red-200" : costModified && effectiveCost < card.cost ? "bg-green-700 text-green-200" : "bg-blue-800 text-blue-200"}`}
      >
        {costText}
      </div>

      {/* Ability indicator — below cost on left for row/popup */}
      {card.abilityId && (
        <div
          className={`absolute left-0.5 bg-yellow-600/80 rounded-full flex items-center justify-center z-10 ${
            isRowOrPopup
              ? "top-[44px] w-4 h-4"
              : isMobile
                ? "top-5 w-3.5 h-3.5"
                : "top-8 w-5 h-5"
          }`}
        >
          <span
            className={
              isRowOrPopup
                ? "text-[8px]"
                : isMobile
                  ? "text-[7px]"
                  : "text-[10px]"
            }
          >
            {ICONS.lightning}
          </span>
        </div>
      )}

      {/* REACT badge — left side for row/popup, right side for desktop */}
      {isReaction && !isMyTurn && (
        <div
          className={`absolute bg-orange-500 text-white font-bold px-1 py-0.5 rounded z-10 animate-pulse ${
            isRowOrPopup
              ? "left-0.5 bottom-4 text-[7px]"
              : isMobile
                ? "right-0.5 top-5 text-[6px]"
                : "right-0.5 top-8 text-[9px]"
          }`}
        >
          REACT
        </div>
      )}

      {/* Unaffordable darkening overlay for row/popup (instead of opacity which bleeds through overlapping cards) */}
      {isRowOrPopup && !canAfford && !isTutorialHighlight && (
        <div className="absolute inset-0 bg-black/50 z-10 rounded-lg" />
      )}

      {/* Tutorial: dim non-target cards */}
      {isTutorialBlocked && (
        <div className="absolute inset-0 bg-black/60 z-20 rounded-lg" />
      )}

      {/* Tutorial: wrong card toast */}
      {showWrongToast && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="bg-red-900/90 border border-red-500 text-red-200 text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
            Not this one
          </div>
        </div>
      )}

      {/* Tutorial: card name label on highlighted card */}
      {isTutorialHighlight && !isSelected && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-30 pointer-events-none whitespace-nowrap">
          <div className="bg-[var(--color-gold)] text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg animate-bounce">
            {card.name}
          </div>
        </div>
      )}

      {/* Stats bar at bottom */}
      {card.type === "Creature" &&
        (isRowOrPopup ? (
          <div
            className={`absolute bottom-0 left-0 right-0 bg-black/80 flex justify-around z-10 ${variant === "popup" ? "py-1 text-[12px]" : "py-0.5 text-[10px]"}`}
          >
            <span className="text-red-400 font-bold flex flex-col items-center leading-tight">
              <span>{ICONS.swords}</span>
              <span>{card.attack}</span>
            </span>
            <span className="text-blue-400 font-bold flex flex-col items-center leading-tight">
              <span>{ICONS.shield}</span>
              <span>{card.defence}</span>
            </span>
            <span className="text-yellow-400 font-bold flex flex-col items-center leading-tight">
              <span>{ICONS.coin}</span>
              <span>{card.sp}</span>
            </span>
          </div>
        ) : (
          <div
            className={`absolute bottom-0 left-0 right-0 bg-black/80 flex justify-between px-1.5 z-10 ${isMobile ? "text-[9px] py-0.5" : "text-[12px] py-0.5"}`}
          >
            <span className="text-red-400 font-bold">
              {ICONS.swords}
              {card.attack}
            </span>
            <span className="text-blue-400 font-bold">
              {ICONS.shield}
              {card.defence}
            </span>
            <span className="text-yellow-400 font-bold">
              {ICONS.coin}
              {card.sp}
            </span>
          </div>
        ))}
    </motion.div>
  );
}
