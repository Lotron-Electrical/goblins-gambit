import { useRef, useCallback } from 'react';
import { useStore } from '../../store.js';
import { motion } from 'framer-motion';
import { ICONS, TYPE_ICON } from '../ui/icons.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { THEME_EFFECTS } from '../../../../shared/src/constants.js';

const TYPE_BORDER = {
  Creature: 'border-red-600 hover:border-red-400',
  Magic: 'border-blue-600 hover:border-blue-400',
  Armour: 'border-gray-500 hover:border-gray-300',
  Tricks: 'border-green-600 hover:border-green-400',
};

// Border style by type (visual differentiation beyond colour)
const TYPE_BORDER_STYLE = {
  Creature: 'border-solid',
  Magic: 'border-dashed',
  Armour: 'border-double',
  Tricks: 'border-dotted',
};

const TYPE_LETTER = { Creature: 'C', Magic: 'M', Armour: 'A', Tricks: 'T' };
const REACTION_ABILITIES = ['stfu_silence', 'lagg_delay'];
const DRAG_THRESHOLD = 15;

export default function CardInHand({ card, isSelected }) {
  const { selectCard, playCard, gameState, setZoomedCard, setHoveredCard, clearHoveredCard, animationsOff, setDraggingCard, clearDraggingCard } = useStore();
  const isMyTurn = gameState?.currentPlayerId === gameState?.myId;
  const isReaction = REACTION_ABILITIES.includes(card.abilityId);
  const isMobile = useIsMobile();
  const longPressTimer = useRef(null);
  const isDragging = useRef(false);
  const touchStart = useRef(null);

  const canDrag = card.type === 'Creature' && (isMyTurn || isReaction);

  const handleClick = () => {
    // If we just finished a drag, don't fire click
    if (isDragging.current) return;
    if (!isMyTurn && !isReaction) return;
    if (isSelected || (!isMyTurn && isReaction)) {
      // Creatures are placed via swamp slot click, not double-click
      if (card.type === 'Creature') return;
      playCard(card.uid);
    } else {
      selectCard(card);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setZoomedCard(card);
  };

  // Long-press to zoom on mobile, with drag detection
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    isDragging.current = false;

    longPressTimer.current = setTimeout(() => {
      if (!isDragging.current) {
        setZoomedCard(card);
      }
      longPressTimer.current = null;
    }, 400);
  }, [card, setZoomedCard]);

  const handleTouchMove = useCallback((e) => {
    if (!touchStart.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (!isDragging.current && dist > DRAG_THRESHOLD && canDrag) {
      // Cancel long-press and start drag
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      isDragging.current = true;
      setDraggingCard(card);
    }

    if (isDragging.current) {
      e.preventDefault(); // prevent scroll while dragging
    }
  }, [card, canDrag, setDraggingCard]);

  const handleTouchEnd = useCallback((e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (isDragging.current) {
      // Check if we dropped on a valid slot
      const touch = e.changedTouches[0];
      const dropEl = document.elementFromPoint(touch.clientX, touch.clientY);
      const slotEl = dropEl?.closest?.('[data-drop-slot]');
      if (slotEl) {
        const slotIdx = parseInt(slotEl.getAttribute('data-drop-slot'), 10);
        playCard(card.uid, { slotIndex: slotIdx });
      }
      clearDraggingCard();
      // Prevent the click handler from firing after drag
      setTimeout(() => { isDragging.current = false; }, 0);
    } else {
      isDragging.current = false;
    }
    touchStart.current = null;
  }, [card, playCard, clearDraggingCard]);

  // Desktop HTML5 drag
  const handleDragStart = useCallback((e) => {
    if (!canDrag) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.uid);
    setDraggingCard(card);
  }, [card, canDrag, setDraggingCard]);

  const handleDragEnd = useCallback(() => {
    clearDraggingCard();
  }, [clearDraggingCard]);

  const draggingCard = useStore(s => s.draggingCard);
  const isBeingDragged = draggingCard?.uid === card.uid;

  // Compute effective cost with theme modifiers (Blood Moon 2x spells, Frost free spells)
  const themeEffects = THEME_EFFECTS[gameState?.theme] || THEME_EFFECTS.swamp;
  const effectiveCost = card.type === 'Magic' && themeEffects.spellCostMultiplier !== undefined
    ? Math.floor(card.cost * themeEffects.spellCostMultiplier)
    : card.cost;
  const costModified = effectiveCost !== card.cost;
  const costText = effectiveCost === 0 ? 'FREE' : `${effectiveCost} AP`;
  const canAfford = (isMyTurn || isReaction) && (effectiveCost === 0 || (gameState?.players[gameState.myId]?.ap >= effectiveCost));

  const w = isMobile ? 'w-[72px]' : 'w-[130px]';
  const h = isMobile ? 'h-[100px]' : 'h-[182px]';

  return (
    <motion.div
      className={`relative ${w} ${h} rounded-lg border-2 cursor-pointer shrink-0 overflow-hidden ${
        TYPE_BORDER[card.type] || 'border-gray-600'
      } ${TYPE_BORDER_STYLE[card.type] || ''} ${
        isSelected ? 'ring-2 ring-[var(--color-gold)] z-10' : ''
      } ${!canAfford ? 'opacity-50' : ''} ${isBeingDragged ? 'opacity-50' : ''}`}
      data-card-hover
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchMove={isMobile ? handleTouchMove : undefined}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
      onTouchCancel={isMobile ? handleTouchEnd : undefined}
      onMouseEnter={isMobile ? undefined : (e) => setHoveredCard(card, { x: e.clientX, y: e.clientY, zone: 'hand' })}
      onMouseMove={isMobile ? undefined : (e) => setHoveredCard(card, { x: e.clientX, y: e.clientY, zone: 'hand' })}
      onMouseLeave={isMobile ? undefined : clearHoveredCard}
      whileHover={animationsOff || isMobile ? undefined : { y: -12, scale: 1.05, zIndex: 50 }}
      animate={animationsOff ? {} : (isSelected ? { y: isMobile ? -6 : -12, scale: isMobile ? 1.02 : 1.05 } : {})}
      layout
      draggable={!isMobile && canDrag}
      onDragStart={!isMobile ? handleDragStart : undefined}
      onDragEnd={!isMobile ? handleDragEnd : undefined}
    >
      {/* Card art — cropped to artwork only, hiding text portion */}
      {card.image && (
        <img
          src={`/cards/${card.image}`}
          alt={card.name}
          className="absolute inset-0 w-full h-[155%] object-cover object-top"
          draggable={false}
        />
      )}

      {/* Cost badge */}
      <div className={`absolute top-0.5 right-0.5 font-bold px-1 py-0.5 rounded z-10 ${
        isMobile ? 'text-[8px]' : 'text-[12px] px-1.5'
      } ${effectiveCost === 0 ? 'bg-green-700 text-white' : costModified && effectiveCost > card.cost ? 'bg-red-800 text-red-200' : costModified && effectiveCost < card.cost ? 'bg-green-700 text-green-200' : 'bg-blue-800 text-blue-200'}`}>
        {costText}
      </div>

      {/* Type letter badge */}
      <div className={`absolute top-0.5 left-0.5 bg-black/70 rounded-full flex items-center justify-center z-10 font-bold ${
        isMobile ? 'text-[9px] w-4 h-4' : 'text-[12px] w-6 h-6'
      }`}>
        {TYPE_LETTER[card.type]}
      </div>

      {/* Ability indicator */}
      {card.abilityId && (
        <div className={`absolute left-0.5 bg-yellow-600/80 rounded-full flex items-center justify-center z-10 ${
          isMobile ? 'top-5 w-3.5 h-3.5' : 'top-8 w-5 h-5'
        }`}>
          <span className={isMobile ? 'text-[7px]' : 'text-[10px]'}>{ICONS.lightning}</span>
        </div>
      )}

      {/* REACT badge — shown on reaction cards during opponent's turn */}
      {isReaction && !isMyTurn && (
        <div className={`absolute right-0.5 bg-orange-500 text-white font-bold px-1 py-0.5 rounded z-10 animate-pulse ${
          isMobile ? 'top-5 text-[6px]' : 'top-8 text-[9px]'
        }`}>
          REACT
        </div>
      )}

      {/* Stats bar at bottom */}
      {card.type === 'Creature' && (
        <div className={`absolute bottom-0 left-0 right-0 bg-black/80 flex justify-between px-1.5 z-10 ${isMobile ? 'text-[9px] py-0.5' : 'text-[12px] py-0.5'}`}>
          <span className="text-red-400 font-bold">{ICONS.swords}{card.attack}</span>
          <span className="text-blue-400 font-bold">{ICONS.shield}{card.defence}</span>
          <span className="text-yellow-400 font-bold">{ICONS.coin}{card.sp}</span>
        </div>
      )}
    </motion.div>
  );
}
