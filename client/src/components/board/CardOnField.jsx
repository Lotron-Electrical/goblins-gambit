import { useState } from 'react';
import { useStore } from '../../store.js';
import { motion } from 'framer-motion';
import { ICONS, TYPE_ICON } from '../ui/icons.js';

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

  // Calculate health percentage for DEF bar
  const maxDef = card.defence || 1;
  const currentDef = Math.max(0, (card.defence || 0) - (card._defenceDamage || 0) + (card._defenceBuff || 0) + (card._tempShield || 0));
  const defPct = Math.min(100, (currentDef / maxDef) * 100);
  const defColor = defPct > 60 ? 'bg-green-500' : defPct > 30 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <motion.div
      className={`relative w-[110px] h-[150px] rounded-lg border-2 cursor-pointer overflow-hidden ${
        TYPE_BORDER[card.type] || 'border-gray-600'
      } ${isSelected ? 'ring-2 ring-[var(--color-gold)]' : ''} ${
        isValidTarget ? 'ring-2 ring-red-400 animate-pulse' : ''
      } ${invisible ? 'opacity-40' : ''}`}
      style={hovered && !invisible ? { boxShadow: TYPE_GLOW[card.type] } : undefined}
      data-card-hover
      data-card-uid={card.uid}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={(e) => { setHovered(true); setHoveredCard(card, { x: e.clientX, y: e.clientY, zone: 'field' }); }}
      onMouseMove={(e) => setHoveredCard(card, { x: e.clientX, y: e.clientY, zone: 'field' })}
      onMouseLeave={() => { setHovered(false); clearHoveredCard(); }}
      whileHover={animationsOff ? undefined : { scale: 1.05 }}
      animate={animationsOff ? {} : (isAttacking ? { x: [0, 30, 0], transition: { duration: 0.35 } } : isSelected ? { scale: 1.05 } : {})}
      layout
    >
      {/* Card art */}
      {card.image && !invisible && (
        <img
          src={`/cards/${card.image}`}
          alt={card.name}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      )}

      {/* Invisible overlay */}
      {invisible && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <span className="text-gray-500 text-[12px]">???</span>
        </div>
      )}

      {/* Opaque bottom section for text */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-950/95 p-1">
        <div className="text-white text-[13px] font-bold truncate text-center leading-tight">
          {invisible ? '???' : card.name}
        </div>
        {!invisible && card.type === 'Creature' && (
          <div className="flex justify-between text-[12px] px-0.5 mt-0.5">
            <span className="text-red-400 font-bold flex items-center gap-0.5">
              <span className="text-[8px]">{ICONS.swords}</span>{card._attackBuff ? <span className="text-green-400">{(card.attack || 0) + card._attackBuff}</span> : card.attack ?? 0}
            </span>
            <span className={`font-bold flex items-center gap-0.5 ${card._defenceDamage ? 'text-red-400' : 'text-blue-400'}`}>
              <span className="text-[8px]">{ICONS.shield}</span>{currentDef}{card._defenceDamage ? <span className="text-gray-500 text-[7px]">/{card.defence}</span> : null}
            </span>
            <span className="text-yellow-400 font-bold flex items-center gap-0.5">
              <span className="text-[8px]">{ICONS.coin}</span>{card.sp ?? 0}
            </span>
          </div>
        )}
      </div>

      {/* Ability indicator */}
      {!invisible && card.abilityId && (
        <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-yellow-600/80 rounded-full flex items-center justify-center">
          <span className="text-[8px]">{ICONS.lightning}</span>
        </div>
      )}

      {/* Status indicators (top left) */}
      {card._silenced && (
        <div className="absolute top-0.5 left-0.5 bg-red-800 text-white text-[8px] px-1 rounded">
          {ICONS.muted}
        </div>
      )}
      {card._stonerShield && !card._silenced && (
        <div className="absolute top-0.5 left-0.5 bg-green-800 text-white text-[8px] px-1 rounded">
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
