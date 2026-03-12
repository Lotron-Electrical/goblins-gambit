import { useStore } from '../../store.js';
import { motion } from 'framer-motion';
import { ICONS, TYPE_ICON } from '../ui/icons.js';

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

export default function CardInHand({ card, isSelected }) {
  const { selectCard, playCard, gameState, setZoomedCard } = useStore();
  const isMyTurn = gameState?.currentPlayerId === gameState?.myId;

  const handleClick = () => {
    if (!isMyTurn) return;
    if (isSelected) {
      playCard(card.uid);
    } else {
      selectCard(card);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setZoomedCard(card);
  };

  const costText = card.cost === 0 ? 'FREE' : `${card.cost} AP`;
  const canAfford = isMyTurn && (card.cost === 0 || (gameState?.players[gameState.myId]?.ap >= card.cost));

  return (
    <motion.div
      className={`relative w-[100px] h-[140px] rounded-lg border-2 cursor-pointer shrink-0 overflow-hidden ${
        TYPE_BORDER[card.type] || 'border-gray-600'
      } ${TYPE_BORDER_STYLE[card.type] || ''} ${
        isSelected ? 'ring-2 ring-[var(--color-gold)] z-10' : ''
      } ${!canAfford ? 'opacity-50' : ''}`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      whileHover={{ y: -12, scale: 1.05 }}
      animate={isSelected ? { y: -12, scale: 1.05 } : {}}
      layout
    >
      {/* Card art (top 70%) */}
      <div className="absolute inset-0 h-[70%] overflow-hidden">
        {card.image && (
          <img
            src={`/cards/${card.image}`}
            alt={card.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        )}
      </div>

      {/* Cost badge */}
      <div className={`absolute top-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded z-10 ${
        card.cost === 0 ? 'bg-green-700 text-white' : 'bg-blue-800 text-blue-200'
      }`}>
        {costText}
      </div>

      {/* Type icon badge */}
      <div className="absolute top-1 left-1 text-[12px] bg-black/60 w-5 h-5 rounded-full flex items-center justify-center z-10">
        {TYPE_ICON[card.type]}
      </div>

      {/* Ability indicator */}
      {card.abilityId && (
        <div className="absolute top-7 left-1 w-4 h-4 bg-yellow-600/80 rounded-full flex items-center justify-center z-10">
          <span className="text-[8px]">{ICONS.lightning}</span>
        </div>
      )}

      {/* 2px inner frame line */}
      <div className="absolute left-0 right-0 top-[70%] h-[2px] bg-gray-600 z-10" />

      {/* Opaque dark bottom section */}
      <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gray-950 p-1 pt-1.5 flex flex-col justify-center">
        <div className="text-white text-[11px] font-bold truncate text-center leading-tight">{card.name}</div>
        {card.type === 'Creature' && (
          <div className="flex justify-between text-[10px] px-1 mt-0.5">
            <span className="text-red-400 font-bold">{ICONS.swords}{card.attack}</span>
            <span className="text-blue-400 font-bold">{ICONS.shield}{card.defence}</span>
            <span className="text-yellow-400 font-bold">{ICONS.coin}{card.sp}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
