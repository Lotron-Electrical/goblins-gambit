import { useStore } from '../../store.js';
import CardOnField from './CardOnField.jsx';
import { hasActivatedAbility } from '../ui/abilityInfo.js';

const CARD_TYPE_COLOR = {
  Creature: 'border-red-700',
  Magic: 'border-blue-700',
  Armour: 'border-gray-600',
  Tricks: 'border-green-700',
};

export default function PlayerField({ player, playerId, isOpponent, isCurrentTurn, compact }) {
  const { selectedCard, targetMode, attack, selectTarget, gameState, useAbility, setZoomedCard, playCard } = useStore();

  const handleCreatureClick = (creature) => {
    if (!isOpponent) return;

    // If we have a selected creature to attack with
    if (selectedCard && selectedCard._zone === 'swamp' && !targetMode) {
      attack(selectedCard.uid, playerId, creature.uid);
      return;
    }

    // If we're in target selection mode
    if (gameState?.pendingTarget) {
      selectTarget(playerId, creature.uid);
      return;
    }
  };

  const handleAbilityClick = (creature) => {
    if (isOpponent) return;
    if (!hasActivatedAbility(creature.abilityId)) return;
    if (creature._silenced) return;
    useAbility(creature.uid);
  };

  const handleArmourClick = (armour) => {
    if (armour) setZoomedCard(armour);
  };

  const gearSlots = ['head', 'body', 'feet'];
  const isMyTurn = gameState?.currentPlayerId === gameState?.myId;

  return (
    <div className={`rounded-lg p-2 transition ${
      isCurrentTurn ? 'bg-[var(--color-swamp)]/60 ring-1 ring-[var(--color-gold)]/40' : 'bg-gray-900/40'
    }`}>
      {/* Player info bar */}
      <div className="flex items-center justify-between mb-1 px-1">
        <div className="flex items-center gap-2">
          <span className={`font-bold text-[13px] ${isOpponent ? 'text-red-400' : 'text-green-400'}`}>
            {player.name}
          </span>
          {isCurrentTurn && <span className="text-[11px] text-[var(--color-gold)]">TURN</span>}
        </div>
        <div className="flex items-center gap-3 text-[13px]">
          <span className="text-yellow-400 font-bold text-[15px]" data-player-sp={playerId}>{player.sp} SP</span>
          <span className="text-blue-300">{player.ap} AP</span>
          <span className="text-gray-400">{player.handCount ?? player.hand?.length ?? 0} cards</span>
        </div>
      </div>

      <div className="flex gap-2">
        {/* Gear zone */}
        <div className={`flex flex-col gap-1 ${compact ? 'w-20' : 'w-28'} shrink-0 min-w-0`}>
          <div className="text-[11px] text-gray-500 text-center">Gear</div>
          {gearSlots.map((slot) => {
            const armour = player.gear[slot];
            return (
              <div
                key={slot}
                className={`${compact ? 'h-10' : 'h-14'} rounded border cursor-pointer ${
                  armour ? 'border-purple-600 bg-purple-950/40 hover:border-purple-400' : 'border-gray-800 bg-gray-900/40'
                } flex items-center justify-center text-[11px]`}
                onClick={() => handleArmourClick(armour)}
              >
                {armour ? (
                  <div className="text-center px-1">
                    <div className="text-purple-300 font-medium truncate text-[10px]">{armour.name}</div>
                    {!compact && <div className="text-gray-400 text-[9px]">{armour._turnsRemaining ?? armour.durability}T left</div>}
                  </div>
                ) : (
                  <span className="text-gray-700 text-[10px]">{slot}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Swamp zone */}
        <div className="flex-1">
          <div className="text-[11px] text-gray-500 text-center mb-1">The Swamp</div>
          <div className="flex gap-1 justify-center min-h-[100px] bg-[#141808]/50 rounded border border-[#2a3018]/50 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] p-1">
            {Array.from({ length: 5 }).map((_, slotIdx) => {
              const creature = player.swamp[slotIdx] || null;
              const canPlace = !isOpponent && isMyTurn && !creature
                && selectedCard && selectedCard._zone !== 'swamp'
                && selectedCard.type === 'Creature';

              return (
                <div
                  key={slotIdx}
                  className={`relative flex-1 min-w-0 rounded border ${
                    creature
                      ? 'border-transparent'
                      : canPlace
                        ? 'border-dashed border-[var(--color-gold)]/60 bg-[var(--color-gold)]/5 cursor-pointer hover:bg-[var(--color-gold)]/15'
                        : 'border-dashed border-gray-700/50 bg-gray-900/20'
                  } min-h-[90px] flex items-center justify-center transition`}
                  onClick={() => {
                    if (canPlace) {
                      playCard(selectedCard.uid, { slotIndex: slotIdx });
                    }
                  }}
                >
                  {creature ? (
                    <div className="relative">
                      <CardOnField
                        card={creature}
                        isOpponent={isOpponent}
                        onClick={() => handleCreatureClick(creature)}
                        isValidTarget={
                          gameState?.pendingTarget?.validTargets?.some(t => t.uid === creature.uid) || false
                        }
                      />
                      {/* Activated ability button (own creatures only, on your turn) */}
                      {!isOpponent && isMyTurn && hasActivatedAbility(creature.abilityId) && !creature._silenced && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAbilityClick(creature); }}
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-yellow-600 hover:bg-yellow-500 text-[9px] text-black font-bold px-1.5 py-0.5 rounded shadow z-10"
                          title="Use ability"
                        >
                          {'\u26A1'} Use
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-700 text-[10px]">{canPlace ? 'Place here' : ''}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
