import { useMemo } from "react";
import { useStore } from "../../store.js";
import CardOnField from "./CardOnField.jsx";
import { hasActivatedAbility } from "../ui/abilityInfo.js";
import { ICONS } from "../ui/icons.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { THEME_EFFECTS } from "../../../../shared/src/constants.js";

const THEME_FIELD_NAME = {
  swamp: "The Swamp",
  blood: "The Blood Moon",
  frost: "The Frozen Wastes",
};

const CARD_TYPE_COLOR = {
  Creature: "border-red-700",
  Magic: "border-blue-700",
  Armour: "border-gray-600",
  Tricks: "border-green-700",
};

export default function PlayerField({
  player,
  playerId,
  isOpponent,
  isCurrentTurn,
  compact,
}) {
  const {
    selectedCard,
    targetMode,
    attack,
    selectTarget,
    gameState,
    useAbility,
    setZoomedCard,
    playCard,
    setHoveredCard,
    clearHoveredCard,
    theme,
    attackingCardUid,
    defendingCardUid,
    tutorialMode,
    draggingCard,
  } = useStore();
  const isMobile = useIsMobile();
  const isCompact = compact || isMobile;

  const handleCreatureClick = (creature) => {
    if (!isOpponent) return;

    // If we have a selected creature to attack with
    if (selectedCard && selectedCard._zone === "swamp" && !targetMode) {
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

  const gearSlots = ["head", "body", "feet"];
  const isMyTurn = gameState?.currentPlayerId === gameState?.myId;

  // Damage prediction helper
  const themeEffects = THEME_EFFECTS[gameState?.theme] || THEME_EFFECTS.swamp;
  const myId = gameState?.myId;
  const isBerserk = gameState?.berserkPlayerIds?.includes(myId);

  // Account for Swapeewee stat swap in attack calculations
  const getAttackerAtk = (card) => {
    const isSwapped = card.abilityId === "swapeewee_swap" && card._swapped;
    const baseAtk = isSwapped ? card.defence || 0 : card.attack || 0;
    return baseAtk + (card._attackBuff || 0);
  };

  const getPrediction = (targetCreature) => {
    if (
      !isOpponent ||
      !isMyTurn ||
      !selectedCard ||
      selectedCard._zone !== "swamp"
    )
      return null;
    const atkBase = getAttackerAtk(selectedCard);
    let atk = Math.floor(atkBase * (themeEffects.atkMultiplier || 1));
    if (isBerserk && themeEffects.berserkMultiplier)
      atk = Math.floor(atk * themeEffects.berserkMultiplier);
    const isTargetSwapped =
      targetCreature.abilityId === "swapeewee_swap" && targetCreature._swapped;
    const tBaseDef = isTargetSwapped
      ? targetCreature.attack || 0
      : targetCreature.defence || 0;
    const targetDef = Math.max(
      0,
      tBaseDef -
        (targetCreature._defenceDamage || 0) +
        (targetCreature._defenceBuff || 0) +
        (targetCreature._tempShield || 0),
    );
    const kills = atk >= targetDef;
    return { atk, def: targetDef, kills };
  };

  const getDirectPrediction = () => {
    if (!selectedCard || selectedCard._zone !== "swamp") return null;
    const atkBase = getAttackerAtk(selectedCard);
    let atk = Math.floor(atkBase * (themeEffects.atkMultiplier || 1));
    if (isBerserk && themeEffects.berserkMultiplier)
      atk = Math.floor(atk * themeEffects.berserkMultiplier);
    const shield = player.playerShield || 0;
    const effectiveDmg = Math.max(0, atk - shield);
    return { atk, shield, effectiveDmg };
  };

  // Direct attack: can target opponent player if they have no visible creatures
  const visibleCreatures = player.swamp.filter((c) => !c._invisible);
  const canDirectAttack =
    isOpponent &&
    isMyTurn &&
    selectedCard &&
    selectedCard._zone === "swamp" &&
    visibleCreatures.length === 0 &&
    !gameState?.pendingTarget &&
    !tutorialMode;

  const handleDirectAttack = () => {
    if (canDirectAttack) {
      attack(selectedCard.uid, playerId, playerId);
    }
  };

  // SP glow when approaching win
  const spPct = gameState?.winSP ? player.sp / gameState.winSP : 0;
  const spStyle = useMemo(() => {
    if (spPct >= 0.9)
      return "text-yellow-300 animate-[pulse_0.8s_ease-in-out_infinite] drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]";
    if (spPct >= 0.8)
      return "text-yellow-400 animate-[pulse_2s_ease-in-out_infinite] drop-shadow-[0_0_5px_rgba(250,204,21,0.4)]";
    return "text-yellow-400";
  }, [spPct]);

  return (
    <div
      className={`relative rounded-xl ${isMobile ? "p-1.5" : isOpponent ? "p-1.5" : "p-2.5"} transition-all duration-300 border ${
        isCurrentTurn
          ? "bg-[var(--color-swamp)]/70 border-[var(--color-gold)]/30 animate-turn-glow"
          : "bg-gray-900/50 border-gray-800/40"
      } ${gameState?.berserkPlayerIds?.includes(playerId) ? "ring-1 ring-red-600/60 shadow-[0_0_12px_rgba(220,38,38,0.3)]" : ""} ${
        canDirectAttack
          ? "cursor-pointer border-red-500 animate-direct-attack bg-red-950/20"
          : ""
      }`}
      onClick={canDirectAttack ? handleDirectAttack : undefined}
    >
      {/* Player info bar */}
      <div
        className={`flex items-center justify-between ${isOpponent ? "mb-1" : "mb-1.5"} px-1.5 rounded-lg`}
      >
        <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
          <span
            className={`font-display font-bold truncate ${isMobile ? "text-[12px] max-w-[140px]" : "text-[14px] max-w-[200px]"} ${isOpponent ? "text-red-400 drop-shadow-[0_0_4px_rgba(248,113,113,0.3)]" : "text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.3)]"}`}
            title={player.name}
          >
            {player.name}
          </span>
          {gameState?.berserkPlayerIds?.includes(playerId) && (
            <span
              className={`text-red-500 font-bold animate-pulse uppercase tracking-wider ${isMobile ? "text-[8px]" : "text-[10px]"}`}
              title="Berserk -- 2x damage!"
            >
              BERSERK
            </span>
          )}
          {isCurrentTurn && !isOpponent && (
            <span
              className={`bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-bright)] text-black font-display rounded-md shadow-lg shadow-[var(--color-gold)]/20 animate-[pulse_0.6s_ease-in-out_2] ${
                isMobile
                  ? "text-[9px] px-2 py-0.5"
                  : "text-[11px] px-2.5 py-0.5"
              }`}
            >
              YOUR TURN
            </span>
          )}
          {isCurrentTurn && isOpponent && (
            <span
              className={`text-[var(--color-gold)] font-display tracking-wide ${isMobile ? "text-[9px]" : "text-[11px]"}`}
            >
              THEIR TURN
            </span>
          )}
          {canDirectAttack && !isMobile && (
            <span className="text-[10px] text-red-400 font-bold tracking-wide animate-pulse">
              ATTACK DIRECTLY
            </span>
          )}
        </div>
        <div
          className={`flex items-center gap-2 md:gap-3 ${isMobile ? "text-[10px]" : "text-[13px]"}`}
        >
          {player.playerShield > 0 && (
            <span className="text-cyan-400 font-bold flex items-center gap-0.5">
              <span className="opacity-70">{ICONS.shield}</span>
              {player.playerShield}
            </span>
          )}
          <span
            className={`font-bold ${isMobile ? "text-[11px]" : "text-[15px]"} ${spStyle}`}
            data-player-sp={playerId}
          >
            {player.sp}/{gameState.winSP} SP
          </span>
          <span className="text-blue-300 font-medium">{player.ap} AP</span>
          <span
            className={`font-medium ${(player.handCount ?? player.hand?.length ?? 0) >= 10 ? "text-orange-400" : "text-gray-500"}`}
          >
            {player.handCount ?? player.hand?.length ?? 0} cards
          </span>
          {(player.handCount ?? player.hand?.length ?? 0) >= 10 && (
            <span
              className={`text-orange-400 font-bold uppercase tracking-wider ${isMobile ? "text-[7px]" : "text-[9px]"}`}
            >
              ENCUMBERED
            </span>
          )}
        </div>
      </div>

      {/* SP progress bar */}
      {gameState?.winSP && (
        <div
          className={`${isMobile ? "h-2" : isOpponent ? "h-1" : "h-1.5"} rounded-full bg-gray-800/80 mx-1.5 ${isOpponent ? "mb-1" : "mb-1.5"} overflow-hidden relative`}
        >
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out relative ${
              spPct >= 0.9
                ? "bg-gradient-to-r from-yellow-500 via-amber-300 to-yellow-500 animate-sp-shimmer"
                : spPct >= 0.7
                  ? "bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 animate-sp-shimmer"
                  : "bg-gradient-to-r from-yellow-700 to-yellow-500"
            }`}
            style={{
              width: `${Math.min(100, (player.sp / gameState.winSP) * 100)}%`,
              minWidth: player.sp > 0 ? "6px" : undefined,
            }}
          />
          {/* Tick marks at 25%, 50%, 75% */}
          {!isMobile &&
            [25, 50, 75].map((pct) => (
              <div
                key={pct}
                className="absolute top-0 bottom-0 w-px bg-gray-600/40"
                style={{ left: `${pct}%` }}
              />
            ))}
        </div>
      )}

      {/* Gear zone -- horizontal strip */}
      <div
        className={`flex gap-1.5 md:gap-2 ${isOpponent ? "mb-1" : "mb-1.5"} px-1.5`}
      >
        {gearSlots.map((slot) => {
          const armour = player.gear[slot];
          const turnsLeft = armour
            ? (armour._turnsRemaining ?? armour.durability)
            : 0;
          return (
            <div
              key={slot}
              className={`flex-1 ${isMobile ? "h-7" : isOpponent ? "h-6" : "h-8"} rounded-lg border cursor-pointer transition-all duration-200 ${
                armour
                  ? `border-purple-500/60 bg-purple-950/50 hover:border-purple-400 hover:bg-purple-950/70 ${turnsLeft > 1 ? "animate-gear-shimmer" : ""}`
                  : "border-gray-800/60 bg-gray-900/30 border-dashed"
              } flex items-center justify-center`}
              onClick={() => handleArmourClick(armour)}
            >
              {armour ? (
                <div className="flex items-center gap-1 px-1.5">
                  <span
                    className={`text-purple-300 font-medium truncate ${isMobile ? "text-[7px]" : "text-[10px]"}`}
                  >
                    {armour.name}
                  </span>
                  <span
                    className={`font-bold rounded-full px-1 ${turnsLeft <= 1 ? "text-red-400 bg-red-900/40 animate-pulse" : "text-purple-400/80 bg-purple-900/30"} ${isMobile ? "text-[6px]" : "text-[8px]"}`}
                  >
                    {turnsLeft}T
                  </span>
                </div>
              ) : (
                <span
                  className={`text-gray-700 capitalize italic ${isMobile ? "text-[7px]" : "text-[10px]"}`}
                >
                  {slot}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Ability slot + Swamp zone */}
      <div>
        {/* Ability slots — one per creature slot, aligned with swamp grid */}
        {/* Opponent ability indicators — above swamp, read-only */}
        {isOpponent && (
          <div className={`flex gap-0.5 px-1 ${isMobile ? "mb-0.5" : "mb-1"}`}>
            {Array.from({ length: 5 }).map((_, slotIdx) => {
              const creature =
                player.swamp.find((c) => c._slot === slotIdx) || null;
              const hasActivated =
                creature &&
                hasActivatedAbility(creature.abilityId) &&
                !creature._silenced;
              const isPassive =
                creature &&
                creature.abilityId &&
                !hasActivatedAbility(creature.abilityId);
              return (
                <div
                  key={slotIdx}
                  className={`flex-1 min-w-0 ${isMobile ? "h-6" : "h-7"} rounded-lg border flex items-center justify-center transition-all duration-200 ${
                    hasActivated
                      ? "border-yellow-500/50 bg-yellow-950/40"
                      : isPassive
                        ? "border-purple-500/50 bg-purple-950/40"
                        : "border-gray-800/60 bg-gray-900/30 border-dashed"
                  }`}
                >
                  {hasActivated ? (
                    <span
                      className={`text-yellow-400 font-bold truncate px-0.5 ${isMobile ? "text-[7px]" : "text-[9px]"}`}
                    >
                      ⚡ Ability
                    </span>
                  ) : isPassive ? (
                    <span
                      className={`text-purple-400 font-bold truncate px-0.5 ${isMobile ? "text-[7px]" : "text-[9px]"}`}
                    >
                      ⚡ Passive
                    </span>
                  ) : (
                    <span
                      className={`text-gray-700 italic ${isMobile ? "text-[6px]" : "text-[9px]"}`}
                    >
                      Ability
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {/* Own field: above swamp, clickable for activated */}
        {!isOpponent && (
          <div className={`flex gap-0.5 px-1 ${isMobile ? "mb-0.5" : "mb-1"}`}>
            {Array.from({ length: 5 }).map((_, slotIdx) => {
              const creature =
                player.swamp.find((c) => c._slot === slotIdx) || null;
              const canUse =
                isMyTurn &&
                creature &&
                hasActivatedAbility(creature.abilityId) &&
                !creature._silenced;
              const isPassive =
                creature &&
                creature.abilityId &&
                !hasActivatedAbility(creature.abilityId);
              return (
                <div
                  key={slotIdx}
                  className={`flex-1 min-w-0 ${isMobile ? "h-7" : "h-8"} rounded-lg border flex items-center justify-center transition-all duration-200 ${
                    canUse
                      ? "border-yellow-500/60 bg-yellow-950/50 cursor-pointer hover:border-yellow-400 hover:bg-yellow-950/70"
                      : isPassive
                        ? "border-purple-500/50 bg-purple-950/40"
                        : "border-gray-800/60 bg-gray-900/30 border-dashed"
                  }`}
                  onClick={() => canUse && handleAbilityClick(creature)}
                >
                  {canUse ? (
                    <span
                      className={`text-yellow-400 font-bold truncate px-0.5 ${isMobile ? "text-[8px]" : "text-[10px]"}`}
                    >
                      ⚡ Ability
                    </span>
                  ) : isPassive ? (
                    <span
                      className={`text-purple-400 font-bold truncate px-0.5 ${isMobile ? "text-[8px]" : "text-[10px]"}`}
                    >
                      ⚡ Passive
                    </span>
                  ) : (
                    <span
                      className={`text-gray-700 italic ${isMobile ? "text-[7px]" : "text-[10px]"}`}
                    >
                      Ability
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div
          className={`relative flex gap-0.5 justify-center bg-gradient-to-b from-[#141808]/60 to-[#0c1004]/70 rounded-lg border border-[#2a3018]/40 shadow-[inset_0_2px_12px_rgba(0,0,0,0.5)] p-1 md:p-1.5 overflow-hidden ${
            isMobile
              ? "min-h-[92px]"
              : `${isOpponent ? "min-h-[120px]" : "min-h-[140px]"} max-w-[620px] mx-auto`
          }`}
        >
          {/* Fog overlay */}
          <div className="absolute inset-0 pointer-events-none animate-fog-drift bg-gradient-to-r from-transparent via-[#1a2410]/8 to-transparent rounded-lg" />
          {/* Direct attack prediction */}
          {canDirectAttack &&
            (() => {
              const pred = getDirectPrediction();
              return pred ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                  <div
                    className={`bg-red-900/90 border border-red-600 rounded px-2 py-1 text-center ${isMobile ? "text-[10px]" : "text-xs"}`}
                  >
                    <span className="font-bold">
                      Direct Attack:{" "}
                      <span className="text-red-400">
                        {pred.effectiveDmg} dmg
                      </span>
                    </span>
                    {pred.shield > 0 && (
                      <span className="text-red-300"> (-{pred.shield} Sh)</span>
                    )}
                    <span className="text-white"> / </span>
                    <span className="text-[var(--color-gold)] font-bold">
                      {Math.floor(pred.effectiveDmg / 2)} SP gain
                    </span>
                  </div>
                </div>
              ) : null;
            })()}
          {Array.from({ length: 5 }).map((_, slotIdx) => {
            const creature =
              player.swamp.find((c) => c._slot === slotIdx) || null;
            const canPlace =
              !isOpponent &&
              isMyTurn &&
              !creature &&
              selectedCard &&
              selectedCard._zone !== "swamp" &&
              selectedCard.type === "Creature";
            const canDrop =
              !isOpponent &&
              isMyTurn &&
              !creature &&
              draggingCard &&
              draggingCard.type === "Creature";
            return (
              <div
                key={slotIdx}
                data-drop-slot={!isOpponent && !creature ? slotIdx : undefined}
                className={`relative flex-1 min-w-0 rounded-lg border overflow-hidden ${
                  creature
                    ? "border-transparent"
                    : canDrop
                      ? "border-dashed border-[var(--color-gold)] bg-[var(--color-gold)]/20 animate-pulse shadow-[inset_0_0_12px_rgba(212,160,23,0.15)]"
                      : canPlace
                        ? "border-dashed border-[var(--color-gold)]/50 bg-[var(--color-gold)]/5 cursor-pointer hover:bg-[var(--color-gold)]/15 hover:border-[var(--color-gold)]/70 hover:shadow-[inset_0_0_8px_rgba(212,160,23,0.1)]"
                        : "border-dashed border-gray-700/30 bg-gray-900/15"
                } ${isMobile ? "min-h-[56px]" : `${isOpponent ? "min-h-[70px]" : "min-h-[90px]"}`} flex items-center justify-center transition-all duration-200`}
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
                        gameState?.pendingTarget?.validTargets?.some(
                          (t) => t.uid === creature.uid,
                        ) ||
                        (isOpponent &&
                          tutorialMode &&
                          selectedCard &&
                          selectedCard._zone === "swamp") ||
                        false
                      }
                      isAttacking={attackingCardUid === creature.uid}
                      isDefending={defendingCardUid === creature.uid}
                      prediction={getPrediction(creature)}
                    />
                  </div>
                ) : (
                  <span
                    className={`${canDrop ? "text-[var(--color-gold)] font-display font-bold" : canPlace ? "text-[var(--color-gold)]/60 font-display" : "text-gray-700/40"} ${isMobile ? "text-[8px]" : "text-[10px]"}`}
                  >
                    {canDrop ? "Drop" : canPlace ? "Place" : "Empty"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Revealed hand (AMA) */}
      {isOpponent && player._revealed && player.hand?.length > 0 && (
        <div className="mt-1 px-1">
          <div className="text-[10px] text-purple-400 mb-0.5">
            Revealed Hand:
          </div>
          <div className="flex gap-1 flex-wrap">
            {player.hand
              .filter((c) => !c.hidden)
              .map((card) => (
                <div
                  key={card.uid}
                  className={`bg-gray-800 border border-purple-600/40 rounded px-1.5 py-0.5 cursor-pointer hover:border-purple-400 transition ${
                    isMobile ? "text-[9px]" : "text-[11px]"
                  }`}
                  onClick={() => setZoomedCard(card)}
                  onMouseEnter={
                    isMobile
                      ? undefined
                      : (e) =>
                          setHoveredCard(card, {
                            x: e.clientX,
                            y: e.clientY,
                            zone: "field",
                          })
                  }
                  onMouseLeave={isMobile ? undefined : () => clearHoveredCard()}
                >
                  <span className="text-white font-bold">{card.name}</span>
                  {!isMobile && (
                    <span className="text-gray-400 ml-1">{card.type}</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
