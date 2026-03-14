import { useMemo } from 'react';
import { useStore } from '../../store.js';
import CardOnField from './CardOnField.jsx';
import { hasActivatedAbility } from '../ui/abilityInfo.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';

const THEME_FIELD_NAME = {
  swamp: 'The Swamp',
  blood: 'The Blood Moon',
  frost: 'The Frozen Wastes',
};

const CARD_TYPE_COLOR = {
  Creature: 'border-red-700',
  Magic: 'border-blue-700',
  Armour: 'border-gray-600',
  Tricks: 'border-green-700',
};

export default function PlayerField({ player, playerId, isOpponent, isCurrentTurn, compact }) {
  const { selectedCard, targetMode, attack, selectTarget, gameState, useAbility, setZoomedCard, playCard, setHoveredCard, clearHoveredCard, theme, attackingCardUid, defendingCardUid } = useStore();
  const isMobile = useIsMobile();
  const isCompact = compact || isMobile;

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

  // Direct attack: can target opponent player if they have no visible creatures
  const visibleCreatures = player.swamp.filter(c => !c._invisible);
  const canDirectAttack = isOpponent && isMyTurn && selectedCard && selectedCard._zone === 'swamp'
    && visibleCreatures.length === 0 && !gameState?.pendingTarget;

  const handleDirectAttack = () => {
    if (canDirectAttack) {
      attack(selectedCard.uid, playerId, playerId);
    }
  };

  // SP glow when approaching win
  const spPct = gameState?.winSP ? player.sp / gameState.winSP : 0;
  const spStyle = useMemo(() => {
    if (spPct >= 0.9) return 'text-yellow-300 animate-[pulse_0.8s_ease-in-out_infinite] drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]';
    if (spPct >= 0.8) return 'text-yellow-400 animate-[pulse_2s_ease-in-out_infinite] drop-shadow-[0_0_5px_rgba(250,204,21,0.4)]';
    return 'text-yellow-400';
  }, [spPct]);

  return (
    <div
      className={`rounded-lg ${isMobile ? 'p-1' : 'p-2'} transition ${
        isCurrentTurn ? 'bg-[var(--color-swamp)]/60 ring-1 ring-[var(--color-gold)]/40' : 'bg-gray-900/40'
      } ${gameState?.berserkPlayerIds?.includes(playerId) ? 'ring-1 ring-red-600/60 shadow-[0_0_12px_rgba(220,38,38,0.3)]' : ''} ${
        canDirectAttack ? 'cursor-pointer ring-2 ring-red-500 animate-[pulse_1s_ease-in-out_infinite] bg-red-950/20' : ''
      }`}
      onClick={canDirectAttack ? handleDirectAttack : undefined}
    >
      {/* Player info bar */}
      <div
        className="flex items-center justify-between mb-1 px-1 rounded"
      >
        <div className="flex items-center gap-1 md:gap-2 min-w-0">
          {!(isMobile && isOpponent) && (
            <span className={`font-bold truncate ${isMobile ? 'text-[11px] max-w-[140px]' : 'text-[13px] max-w-[200px]'} ${isOpponent ? 'text-red-400' : 'text-green-400'}`} title={player.name}>
              {player.name}
            </span>
          )}
          {gameState?.berserkPlayerIds?.includes(playerId) && (
            <span className={`text-red-500 font-bold animate-pulse ${isMobile ? 'text-[8px]' : 'text-[10px]'}`} title="Berserk — 2x damage!">BERSERK</span>
          )}
          {isCurrentTurn && !isOpponent && (
            <span className={`bg-[var(--color-gold)]/90 text-black font-display rounded shadow animate-[pulse_0.6s_ease-in-out_2] ${
              isMobile ? 'text-[9px] px-1.5 py-0.5' : 'text-[11px] px-2 py-0.5'
            }`}>YOUR TURN</span>
          )}
          {isCurrentTurn && isOpponent && <span className={`text-[var(--color-gold)] ${isMobile ? 'text-[9px]' : 'text-[11px]'}`}>TURN</span>}
          {canDirectAttack && !isMobile && <span className="text-[10px] text-red-400 font-bold">ATTACK DIRECTLY</span>}
        </div>
        <div className={`flex items-center gap-1.5 md:gap-3 ${isMobile ? 'text-[10px]' : 'text-[13px]'}`}>
          {player.playerShield > 0 && (
            <span className="text-cyan-400 font-bold">{player.playerShield} Sh</span>
          )}
          <span className={`font-bold ${isMobile ? 'text-[11px]' : 'text-[15px]'} ${spStyle}`} data-player-sp={playerId}>{player.sp}/{gameState.winSP} SP</span>
          <span className="text-blue-300">{player.ap} AP</span>
          <span className={`font-bold ${(player.handCount ?? player.hand?.length ?? 0) >= 10 ? 'text-orange-400' : 'text-gray-400'}`}>
            {player.handCount ?? player.hand?.length ?? 0} cards
          </span>
          {(player.handCount ?? player.hand?.length ?? 0) >= 10 && (
            <span className={`text-orange-400 font-bold ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}>ENCUMBERED</span>
          )}
        </div>
      </div>

      {/* SP progress bar (opponents) */}
      {isOpponent && gameState?.winSP && (
        <div className="h-1 rounded-full bg-gray-800 mx-1 mb-1">
          <div
            className="h-full rounded-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-500"
            style={{ width: `${Math.min(100, (player.sp / gameState.winSP) * 100)}%` }}
          />
        </div>
      )}

      {/* Gear zone — horizontal strip */}
      <div className="flex gap-0.5 md:gap-1 mb-1 px-1">
        <div className={`text-gray-500 flex items-center ${isMobile ? 'text-[9px] mr-1' : 'text-[11px] mr-1.5'}`}>Gear</div>
        {gearSlots.map((slot) => {
          const armour = player.gear[slot];
          return (
            <div
              key={slot}
              className={`flex-1 ${isMobile ? 'h-6' : 'h-7'} rounded border cursor-pointer ${
                armour ? 'border-purple-600 bg-purple-950/40 hover:border-purple-400' : 'border-gray-800 bg-gray-900/40'
              } flex items-center justify-center`}
              onClick={() => handleArmourClick(armour)}
            >
              {armour ? (
                <div className="flex items-center gap-1 px-1">
                  <span className={`text-purple-300 font-medium truncate ${isMobile ? 'text-[7px]' : 'text-[10px]'}`}>{armour.name}</span>
                  <span className={`text-gray-400 ${isMobile ? 'text-[6px]' : 'text-[9px]'}`}>{armour._turnsRemaining ?? armour.durability}T</span>
                </div>
              ) : (
                <span className={`text-gray-700 ${isMobile ? 'text-[7px]' : 'text-[10px]'}`}>{slot}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Swamp zone — full width */}
      <div>
          <div className={`text-gray-500 text-center mb-0.5 ${isMobile ? 'text-[9px]' : 'text-[11px] mb-1'}`}>{THEME_FIELD_NAME[theme] || 'The Swamp'}</div>
          <div className={`flex gap-0.5 justify-center bg-[#141808]/50 rounded border border-[#2a3018]/50 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] p-0.5 md:p-1 overflow-hidden ${
            isMobile ? 'min-h-[70px]' : 'min-h-[100px] max-w-[600px] mx-auto'
          }`}>
            {Array.from({ length: 5 }).map((_, slotIdx) => {
              const creature = player.swamp.find(c => c._slot === slotIdx) || null;
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
                  } ${isMobile ? 'min-h-[60px]' : 'min-h-[90px]'} flex items-center justify-center transition`}
                  onClick={() => {
                    if (canPlace) {
                      playCard(selectedCard.uid, { slotIndex: slotIdx });
                    }
                  }}
                >
                  {creature ? (
                    <div className="relative min-w-0 w-full">
                      <CardOnField
                        card={creature}
                        isOpponent={isOpponent}
                        onClick={() => handleCreatureClick(creature)}
                        isValidTarget={
                          gameState?.pendingTarget?.validTargets?.some(t => t.uid === creature.uid) || false
                        }
                        isAttacking={attackingCardUid === creature.uid}
                        isDefending={defendingCardUid === creature.uid}
                      />
                      {/* Activated ability button (own creatures only, on your turn) */}
                      {!isOpponent && isMyTurn && hasActivatedAbility(creature.abilityId) && !creature._silenced && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAbilityClick(creature); }}
                          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded shadow z-10 ${
                            isMobile ? 'text-[7px] px-1 py-0' : 'text-[9px] px-1.5 py-0.5'
                          }`}
                          title="Use ability"
                        >
                          {'\u26A1'} Use
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className={`text-gray-700 ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}>{canPlace ? 'Place' : ''}</span>
                  )}
                </div>
              );
            })}
          </div>
      </div>

      {/* Revealed hand (AMA) */}
      {isOpponent && player._revealed && player.hand?.length > 0 && (
        <div className="mt-1 px-1">
          <div className="text-[10px] text-purple-400 mb-0.5">Revealed Hand:</div>
          <div className="flex gap-1 flex-wrap">
            {player.hand.filter(c => !c.hidden).map((card) => (
              <div
                key={card.uid}
                className={`bg-gray-800 border border-purple-600/40 rounded px-1.5 py-0.5 cursor-pointer hover:border-purple-400 transition ${
                  isMobile ? 'text-[9px]' : 'text-[11px]'
                }`}
                onClick={() => setZoomedCard(card)}
                onMouseEnter={isMobile ? undefined : (e) => setHoveredCard(card, { x: e.clientX, y: e.clientY, zone: 'field' })}
                onMouseLeave={isMobile ? undefined : () => clearHoveredCard()}
              >
                <span className="text-white font-bold">{card.name}</span>
                {!isMobile && <span className="text-gray-400 ml-1">{card.type}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
