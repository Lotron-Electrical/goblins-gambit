import { useEffect, useState } from 'react';
import { useStore } from '../../store.js';
import { ICONS, TYPE_ICON } from './icons.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';

export default function CardHoverPreview() {
  const { hoveredCard, hoverPosition, clearHoveredCard } = useStore();
  const [visible, setVisible] = useState(false);
  const [delayedCard, setDelayedCard] = useState(null);
  const [delayedPos, setDelayedPos] = useState(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (hoveredCard && !isMobile) {
      const timer = setTimeout(() => {
        setDelayedCard(hoveredCard);
        setDelayedPos(hoverPosition);
        setVisible(true);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
      setDelayedCard(null);
      setDelayedPos(null);
    }
  }, [hoveredCard, hoverPosition, isMobile]);

  // Safety net: if mouse isn't over a card element, clear stale hover state
  useEffect(() => {
    if (!hoveredCard || isMobile) return;
    const handleMouseMove = (e) => {
      const target = e.target;
      if (!target.closest('[data-card-hover]')) {
        clearHoveredCard();
      }
    };
    const timer = setTimeout(() => {
      window.addEventListener('mousemove', handleMouseMove, { once: true });
    }, 500);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [hoveredCard, clearHoveredCard, isMobile]);

  // Don't render on mobile — use CardZoom (long-press) instead
  if (isMobile || !visible || !delayedCard || !delayedPos) return null;

  const card = delayedCard;
  const previewW = 200;
  const previewH = 280;
  const gap = 16;

  // Position: offset from cursor, clamped to viewport
  let left = delayedPos.x + gap;
  let top = delayedPos.y - previewH / 2;

  // If hovering hand cards (bottom of screen), show above cursor
  if (delayedPos.zone === 'hand') {
    top = delayedPos.y - previewH - gap;
  }

  // Clamp to viewport
  if (left + previewW > window.innerWidth) left = delayedPos.x - previewW - gap;
  if (top < 8) top = 8;
  if (top + previewH > window.innerHeight - 8) top = window.innerHeight - previewH - 8;

  const costText = card.cost === 0 ? 'FREE' : `${card.cost} AP`;

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{ left, top, width: previewW, height: previewH }}
    >
      <div className="w-full h-full rounded-xl border-2 border-[var(--color-gold)] bg-gray-950 overflow-hidden shadow-2xl flex flex-col">
        {/* Card art (top 50%) */}
        <div className="relative h-[50%] overflow-hidden bg-gray-800">
          {card.image && (
            <img
              src={`/cards/${card.image}`}
              alt={card.name}
              className="w-full h-full object-cover"
              draggable={false}
            />
          )}
          {/* Cost badge */}
          <div className={`absolute top-2 right-2 text-[12px] font-bold px-2 py-0.5 rounded ${
            card.cost === 0 ? 'bg-green-700 text-white' : 'bg-blue-800 text-blue-200'
          }`}>
            {costText}
          </div>
          {/* Type icon */}
          <div className="absolute top-2 left-2 text-[16px] bg-black/60 w-7 h-7 rounded-full flex items-center justify-center">
            {TYPE_ICON[card.type]}
          </div>
        </div>

        {/* Card info (bottom 50%) */}
        <div className="flex-1 p-2.5 flex flex-col gap-1">
          <div className="text-white text-[14px] font-bold text-center leading-tight">{card.name}</div>
          <div className="text-gray-400 text-[11px] text-center">{card.type}</div>

          {card.type === 'Creature' && (
            <div className="flex justify-center gap-4 text-[13px] mt-1">
              <span className="text-red-400 font-bold">{ICONS.swords} {card.attack}</span>
              <span className="text-blue-400 font-bold">{ICONS.shield} {card.defence}</span>
              <span className="text-yellow-400 font-bold">{ICONS.coin} {card.sp}</span>
            </div>
          )}

          {card.effect && (
            <div className="text-gray-300 text-[11px] mt-1 leading-snug text-center line-clamp-3">
              {card.effect}
            </div>
          )}

          {card.abilityId && (
            <div className="text-yellow-400 text-[10px] text-center mt-auto">
              {ICONS.lightning} Has Ability
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
