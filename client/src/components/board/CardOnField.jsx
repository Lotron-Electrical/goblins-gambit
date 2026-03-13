import { useState, useRef, useCallback } from 'react';
import { useStore } from '../../store.js';
import { motion } from 'framer-motion';
import { ICONS, TYPE_ICON } from '../ui/icons.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';

const TYPE_BORDER = {
  Creature: 'border-red-600',
  Magic: 'border-blue-600',
  Armour: 'border-gray-500',
  Tricks: 'border-green-600',
};

const TYPE_GLOW = {
  Creature: '0 0 20px rgba(220, 38, 38, 0.5)',
  Magic: '0 0 20px rgba(37, 99, 235, 0.5)',
  Armour: '0 0 20px rgba(107, 114, 128, 0.5)',
  Tricks: '0 0 20px rgba(22, 163, 74, 0.5)',
};

export default function CardOnField({ card, isOpponent, onClick, isValidTarget, isAttacking }) {
  const { selectedCard, selectCard, setZoomedCard, setHoveredCard, clearHoveredCard, animationsOff } = useStore();
  const [hovered, setHovered] = useState(false);
  const isSelected = selectedCard?.uid === card.uid;
  const invisible = card._invisible;
  const isMobile = useIsMobile();
  const longPressTimer = useRef(null);

  const handleClick = () => {
    if (isOpponent) {
      onClick?.();
    } else {
      selectCard({ ...card, _zone: 'swamp' });
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

  // Calculate health percentage for DEF bar
  const maxDef = card.defence || 1;
  const currentDef = Math.max(0, (card.defence || 0) - (card._defenceDamage || 0) + (card._defenceBuff || 0) + (card._tempShield || 0));
  const defPct = Math.min(100, (currentDef / maxDef) * 100);
  const defColor = defPct > 60 ? 'bg-green-500' : defPct > 30 ? 'bg-yellow-500' : 'bg-red-500';

  const w = isMobile ? 'w-[70px]' : 'w-[110px]';
  const h = isMobile ? 'h-[96px]' : 'h-[150px]';

  return (
    <motion.div
      className={`relative ${w} ${h} rounded-lg border-2 cursor-pointer overflow-hidden ${
        TYPE_BORDER[card.type] || 'border-gray-600'
      } ${isSelected ? 'ring-2 ring-[var(--color-gold)]' : ''} ${
        isValidTarget ? 'ring-2 ring-red-400 animate-pulse' : ''
      } ${invisible ? 'opacity-40' : ''}`}
      style={hovered && !invisible ? { boxShadow: TYPE_GLOW[card.type] } : undefined}
      data-card-hover
      data-card-uid={card.uid}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
      onTouchCancel={isMobile ? handleTouchEnd : undefined}
      onMouseEnter={isMobile ? undefined : (e) => { setHovered(true); setHoveredCard(card, { x: e.clientX, y: e.clientY, zone: 'field' }); }}
      onMouseMove={isMobile ? undefined : (e) => setHoveredCard(card, { x: e.clientX, y: e.clientY, zone: 'field' })}
      onMouseLeave={isMobile ? undefined : () => { setHovered(false); clearHoveredCard(); }}
      whileHover={animationsOff || isMobile ? undefined : { scale: 1.05 }}
      animate={animationsOff ? {} : (isAttacking ? { x: [0, 30, 0], transition: { duration: 0.35 } } : isSelected ? { scale: 1.05 } : {})}
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
          <span className={`text-gray-500 ${isMobile ? 'text-[10px]' : 'text-[12px]'}`}>???</span>
        </div>
      )}


      {/* Ability indicator */}
      {!invisible && card.abilityId && (
        <div className={`absolute top-0.5 right-0.5 bg-yellow-600/80 rounded-full flex items-center justify-center ${
          isMobile ? 'w-3 h-3' : 'w-4 h-4'
        }`}>
          <span className={isMobile ? 'text-[6px]' : 'text-[8px]'}>{ICONS.lightning}</span>
        </div>
      )}

      {/* Status indicators (top left) */}
      {card._silenced && (
        <div className={`absolute top-0.5 left-0.5 bg-red-800 text-white px-1 rounded ${isMobile ? 'text-[6px]' : 'text-[8px]'}`}>
          {ICONS.muted}
        </div>
      )}
      {card._stonerShield && !card._silenced && (
        <div className={`absolute top-0.5 left-0.5 bg-green-800 text-white px-1 rounded ${isMobile ? 'text-[6px]' : 'text-[8px]'}`}>
          {ICONS.shield}
        </div>
      )}

      {/* DEF health bar at bottom */}
      {!invisible && card.type === 'Creature' && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px]">
          <div className={`h-full ${defColor} transition-all duration-300`} style={{ width: `${defPct}%` }} />
        </div>
      )}
    </motion.div>
  );
}
