import { useStore } from '../../store.js';
import { hasActivatedAbility } from './abilityInfo.js';
import { ICONS, TYPE_ICON } from './icons.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';

const TYPE_COLOR = {
  Creature: 'border-red-600 bg-red-950/90',
  Magic: 'border-blue-600 bg-blue-950/90',
  Armour: 'border-gray-500 bg-gray-900/90',
  Tricks: 'border-green-600 bg-green-950/90',
};

export default function CardZoom() {
  const { zoomedCard, setZoomedCard, gameState } = useStore();
  const isMobile = useIsMobile();

  if (!zoomedCard) return null;
  const card = zoomedCard;

  const maxAtk = 1000;
  const maxDef = 2000;
  const maxSp = 1500;

  if (isMobile) {
    // Full-screen overlay on mobile
    return (
      <div
        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        onClick={() => setZoomedCard(null)}
      >
        <div
          className="w-full max-w-[300px] bg-gray-950 rounded-xl border-2 border-gray-700 overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Card art — cropped to artwork only */}
          <div className="relative h-[200px] overflow-hidden">
            {card.image && (
              <img src={`/cards/${card.image}`} alt={card.name} className="w-full h-[155%] object-cover object-top" draggable={false} />
            )}
          </div>

          {/* Card info */}
          <div className="p-3 space-y-2">
            <div>
              <h3 className="font-display text-[16px] text-white leading-tight">{card.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[13px]">{TYPE_ICON[card.type]}</span>
                <span className="text-[13px] text-gray-400">{card.type}</span>
                {card.cost !== undefined && (
                  <span className={`text-[13px] ml-auto font-bold ${card.cost === 0 ? 'text-green-400' : 'text-blue-300'}`}>
                    {card.cost === 0 ? 'FREE' : `${card.cost} AP`}
                  </span>
                )}
              </div>
            </div>

            {card.type === 'Creature' && (() => {
              const currentAtk = (card.attack || 0) + (card._attackBuff || 0);
              const currentHP = Math.max(0, (card.defence || 0) - (card._defenceDamage || 0) + (card._defenceBuff || 0) + (card._tempShield || 0));
              const baseHP = card.defence || 0;
              return (
                <div className="space-y-1.5">
                  <StatBar label="Attack" value={currentAtk} max={maxAtk} color="bg-red-500" buffed={card._attackBuff > 0} />
                  <StatBar label="Health" value={currentHP} max={baseHP || 1} color="bg-blue-500" damaged={card._defenceDamage > 0} suffix={` / ${baseHP}`} />
                  <StatBar label="SP" value={card.sp ?? 0} max={maxSp} color="bg-yellow-500" />
                </div>
              );
            })()}

            {card.type === 'Armour' && (
              <div className="text-[13px] text-gray-300 space-y-1">
                <div>Slot: <span className="text-white capitalize">{card.slot}</span></div>
                <div>Set: <span className="text-purple-300 capitalize">{card.set}</span></div>
                {card.shieldAmount && <div>Shield: <span className="text-green-400">+{card.shieldAmount}</span></div>}
                {card.incomeAmount && <div>Income: <span className="text-yellow-400">+{card.incomeAmount} SP/turn</span></div>}
                {card.discountAmount && <div>Discount: <span className="text-blue-400">-{card.discountAmount} SP</span></div>}
                {card.blockedType && <div>Blocks: <span className="text-red-400">{card.blockedType}</span></div>}
              </div>
            )}

            {card.effect && (
              <div className="text-[13px] text-gray-200 leading-relaxed border-t border-gray-800 pt-2">
                {card.effect}
              </div>
            )}

            {card.abilityId && (
              <div className="text-[11px] text-yellow-400 flex items-center gap-1">
                <span>{ICONS.lightning}</span>
                {hasActivatedAbility(card.abilityId) ? 'Activated ability (use on your turn)' : 'Special ability'}
              </div>
            )}

            {(card._silenced || card._stonerShield || card._invisible || card._snaccReturn) && (
              <div className="border-t border-gray-800 pt-2 space-y-1">
                {card._silenced && <div className="text-[11px] text-red-400">{ICONS.muted} Silenced</div>}
                {card._stonerShield && <div className="text-[11px] text-green-400">{ICONS.shield} Shield Active</div>}
                {card._invisible && <div className="text-[11px] text-gray-400">{ICONS.ghost} Invisible</div>}
                {card._snaccReturn && <div className="text-[11px] text-purple-400">{ICONS.clock} Returns to owner next turn</div>}
              </div>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={() => setZoomedCard(null)}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 text-[14px] transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Desktop: side panel
  return (
    <div className="fixed right-0 top-0 bottom-0 w-[260px] z-40 flex flex-col shadow-2xl border-l-2 border-gray-700 bg-gray-950/95 animate-slide-in-right">
      {/* Close button */}
      <button
        onClick={() => setZoomedCard(null)}
        className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center text-xl text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg z-50 transition"
        aria-label="Close"
      >
        X
      </button>

      {/* Card art — cropped to artwork only */}
      <div className="relative h-[200px] overflow-hidden shrink-0">
        {card.image && (
          <img
            src={`/cards/${card.image}`}
            alt={card.name}
            className="w-full h-[155%] object-cover object-top"
            draggable={false}
          />
        )}
      </div>

      {/* Card info */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Name + type */}
        <div>
          <h3 className="font-display text-[18px] text-white leading-tight">{card.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[14px]">{TYPE_ICON[card.type]}</span>
            <span className="text-[14px] text-gray-400">{card.type}</span>
            {card.cost !== undefined && (
              <span className={`text-[14px] ml-auto font-bold ${card.cost === 0 ? 'text-green-400' : 'text-blue-300'}`}>
                {card.cost === 0 ? 'FREE' : `${card.cost} AP`}
              </span>
            )}
          </div>
        </div>

        {/* Stats with bars */}
        {card.type === 'Creature' && (() => {
          const currentAtk = (card.attack || 0) + (card._attackBuff || 0);
          const currentHP = Math.max(0, (card.defence || 0) - (card._defenceDamage || 0) + (card._defenceBuff || 0) + (card._tempShield || 0));
          const baseHP = card.defence || 0;
          return (
            <div className="space-y-2">
              <StatBar label="Attack" value={currentAtk} max={maxAtk} color="bg-red-500" buffed={card._attackBuff > 0} />
              <StatBar label="Health" value={currentHP} max={baseHP || 1} color="bg-blue-500" damaged={card._defenceDamage > 0} suffix={` / ${baseHP}`} />
              <StatBar label="SP" value={card.sp ?? 0} max={maxSp} color="bg-yellow-500" />
            </div>
          );
        })()}

        {/* Armour info */}
        {card.type === 'Armour' && (
          <div className="text-[14px] text-gray-300 space-y-1">
            <div>Slot: <span className="text-white capitalize">{card.slot}</span></div>
            <div>Set: <span className="text-purple-300 capitalize">{card.set}</span></div>
            {card.shieldAmount && <div>Shield: <span className="text-green-400">+{card.shieldAmount}</span></div>}
            {card.incomeAmount && <div>Income: <span className="text-yellow-400">+{card.incomeAmount} SP/turn</span></div>}
            {card.discountAmount && <div>Discount: <span className="text-blue-400">-{card.discountAmount} SP</span></div>}
            {card.blockedType && <div>Blocks: <span className="text-red-400">{card.blockedType}</span></div>}
          </div>
        )}

        {/* Effect text */}
        {card.effect && (
          <div className="text-[14px] text-gray-200 leading-relaxed border-t border-gray-800 pt-2">
            {card.effect}
          </div>
        )}

        {/* Ability indicator */}
        {card.abilityId && (
          <div className="text-[12px] text-yellow-400 flex items-center gap-1">
            <span>{ICONS.lightning}</span>
            {hasActivatedAbility(card.abilityId) ? 'Activated ability (use on your turn)' : 'Special ability'}
          </div>
        )}

        {/* Status effects */}
        {(card._silenced || card._stonerShield || card._invisible || card._snaccReturn) && (
          <div className="border-t border-gray-800 pt-2 space-y-1">
            {card._silenced && <div className="text-[12px] text-red-400">{ICONS.muted} Silenced</div>}
            {card._stonerShield && <div className="text-[12px] text-green-400">{ICONS.shield} Shield Active</div>}
            {card._invisible && <div className="text-[12px] text-gray-400">{ICONS.ghost} Invisible</div>}
            {card._snaccReturn && <div className="text-[12px] text-purple-400">{ICONS.clock} Returns to owner next turn</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBar({ label, value, max, color, buffed, damaged, suffix }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-[14px] mb-0.5">
        <span className="text-gray-400">{label}</span>
        <span className={`font-bold ${buffed ? 'text-green-400' : damaged ? 'text-red-400' : 'text-white'}`}>
          {value}{suffix && <span className="text-gray-500 font-normal">{suffix}</span>}
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
