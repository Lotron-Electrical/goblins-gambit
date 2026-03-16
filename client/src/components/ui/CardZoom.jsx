import { useEffect, useState } from "react";
import { useStore } from "../../store.js";
import { hasActivatedAbility } from "./abilityInfo.js";
import { ICONS, TYPE_ICON } from "./icons.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { THEME_EFFECTS } from "../../../../shared/src/constants.js";

const TYPE_COLOR = {
  Creature: "border-red-600 bg-red-950/90",
  Magic: "border-blue-600 bg-blue-950/90",
  Armour: "border-gray-500 bg-gray-900/90",
  Tricks: "border-green-600 bg-green-950/90",
};

export default function CardZoom() {
  const {
    zoomedCard,
    setZoomedCard,
    gameState,
    discardCard,
    recycleCreature,
    playCard,
    selectCard,
    tutorialEngine,
  } = useStore();
  const isMobile = useIsMobile();
  const [confirmAction, setConfirmAction] = useState(null); // 'discard' | 'recycle' | null

  // Reset confirmation when zoomed card changes
  useEffect(() => {
    setConfirmAction(null);
  }, [zoomedCard?.uid]);

  useEffect(() => {
    if (!zoomedCard) return;
    const handler = (e) => {
      if (e.key === "Escape") setZoomedCard(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [zoomedCard, setZoomedCard]);

  if (!zoomedCard) return null;
  const card = zoomedCard;

  // Tutorial: highlight the zoomed card with gold border if it's the tutorial target
  const tutStepConfig = tutorialEngine ? tutorialEngine.getStepConfig() : null;
  const isTutorialHighlight = tutStepConfig?.highlightCardUid === card.uid;

  // Determine if card is in player's hand or on their field
  const myId = gameState?.myId;
  const myPlayer = myId ? gameState.players[myId] : null;
  const isInMyHand = myPlayer?.hand?.some((c) => c.uid === card.uid);
  const isOnMyField = myPlayer?.swamp?.some((c) => c.uid === card.uid);
  const isMyTurn = gameState?.currentPlayerId === myId;
  const canDiscard = isInMyHand && isMyTurn;
  const canPlay = isInMyHand && isMyTurn;
  const canRecycle = isOnMyField && card.type === "Creature" && isMyTurn;
  const recycleSPCost = canRecycle ? Math.ceil((card.sp || 0) / 2) : 0;
  const canAffordRecycle = canRecycle && (myPlayer?.sp ?? 0) >= recycleSPCost;
  const canAttack =
    isOnMyField && card.type === "Creature" && isMyTurn && !card._hasAttacked;

  // Compute effective cost with theme modifiers
  const themeEffects =
    THEME_EFFECTS[useStore.getState().theme] || THEME_EFFECTS.swamp;
  const effectiveCost =
    card.type === "Magic" &&
    card.cost !== undefined &&
    themeEffects.spellCostMultiplier !== undefined
      ? Math.floor(card.cost * themeEffects.spellCostMultiplier)
      : card.cost;
  const costModified = effectiveCost !== card.cost;

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
          className={`w-full max-w-[300px] max-h-[85dvh] bg-gray-950 rounded-xl border-2 overflow-hidden shadow-2xl flex flex-col ${
            isTutorialHighlight
              ? "border-[var(--color-gold)] shadow-[0_0_20px_rgba(212,175,55,0.5)]"
              : "border-gray-700"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Card art — cropped to artwork only, constrained height */}
          {card.image && (
            <img
              src={`/cards/${card.image}`}
              alt={card.name}
              className="w-full shrink-0 max-h-[30dvh] object-cover object-top"
              draggable={false}
            />
          )}

          {/* Card info — scrollable */}
          <div className="p-3 space-y-2 overflow-y-auto flex-1 min-h-0">
            <div>
              <h3 className="font-display text-[16px] text-white leading-tight">
                {card.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[13px]">{TYPE_ICON[card.type]}</span>
                <span className="text-[13px] text-gray-400">{card.type}</span>
                {card.cost !== undefined && (
                  <span
                    className={`text-[13px] ml-auto font-bold ${effectiveCost === 0 ? "text-green-400" : costModified ? "text-red-400" : "text-blue-300"}`}
                  >
                    {effectiveCost === 0 ? "FREE" : `${effectiveCost} AP`}
                  </span>
                )}
              </div>
            </div>

            {card.type === "Creature" &&
              (() => {
                const currentAtk = (card.attack || 0) + (card._attackBuff || 0);
                const currentHP = Math.max(
                  0,
                  (card.defence || 0) -
                    (card._defenceDamage || 0) +
                    (card._defenceBuff || 0) +
                    (card._tempShield || 0),
                );
                const baseHP = card.defence || 0;
                return (
                  <div className="space-y-1.5">
                    <StatBar
                      label="Attack"
                      value={currentAtk}
                      max={maxAtk}
                      color="bg-red-500"
                      buffed={card._attackBuff > 0}
                    />
                    <StatBar
                      label="Health"
                      value={currentHP}
                      max={baseHP || 1}
                      color="bg-blue-500"
                      damaged={card._defenceDamage > 0}
                      suffix={` / ${baseHP}`}
                    />
                    <StatBar
                      label="SP"
                      value={card.sp ?? 0}
                      max={maxSp}
                      color="bg-yellow-500"
                    />
                  </div>
                );
              })()}

            {card.type === "Armour" && (
              <div className="text-[13px] text-gray-300 space-y-1">
                <div>
                  Slot:{" "}
                  <span className="text-white capitalize">{card.slot}</span>
                </div>
                <div>
                  Set:{" "}
                  <span className="text-purple-300 capitalize">{card.set}</span>
                </div>
                {card.shieldAmount && (
                  <div>
                    Shield:{" "}
                    <span className="text-green-400">+{card.shieldAmount}</span>
                  </div>
                )}
                {card.incomeAmount && (
                  <div>
                    Income:{" "}
                    <span className="text-yellow-400">
                      +{card.incomeAmount} SP/turn
                    </span>
                  </div>
                )}
                {card.discountAmount && (
                  <div>
                    Discount:{" "}
                    <span className="text-blue-400">
                      -{card.discountAmount} SP
                    </span>
                  </div>
                )}
                {card.blockedType && (
                  <div>
                    Blocks:{" "}
                    <span className="text-red-400">{card.blockedType}</span>
                  </div>
                )}
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
                {hasActivatedAbility(card.abilityId)
                  ? "Activated ability (use on your turn)"
                  : "Special ability"}
              </div>
            )}

            {(card._silenced ||
              card._stonerShield ||
              card._invisible ||
              card._snaccReturn) && (
              <div className="border-t border-gray-800 pt-2 space-y-1">
                {card._silenced && (
                  <div className="text-[11px] text-red-400">
                    {ICONS.muted} Silenced
                  </div>
                )}
                {card._stonerShield && (
                  <div className="text-[11px] text-green-400">
                    {ICONS.shield} Shield Active
                  </div>
                )}
                {card._invisible && (
                  <div className="text-[11px] text-gray-400">
                    {ICONS.ghost} Invisible
                  </div>
                )}
                {card._snaccReturn && (
                  <div className="text-[11px] text-purple-400">
                    {ICONS.clock} Returns to owner next turn
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          {(canPlay || canDiscard || canRecycle || canAttack) && (
            <div className="px-3 pb-2">
              {confirmAction ? (
                <div className="bg-red-950 border border-red-700 rounded-lg p-3 space-y-2">
                  <p className="text-[13px] text-red-200 text-center">
                    {confirmAction === "discard"
                      ? `Discard ${card.name} from your hand? This cannot be undone.`
                      : `Sacrifice ${card.name} for +${Math.max(0, (card.defence || 0) - (card._defenceDamage || 0) + (card._defenceBuff || 0) + (card._tempShield || 0))} shield? Costs ${recycleSPCost} SP. This cannot be undone.`}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmAction(null)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg text-[13px] transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() =>
                        confirmAction === "discard"
                          ? discardCard(card.uid)
                          : recycleCreature(card.uid)
                      }
                      className="flex-1 bg-red-700 hover:bg-red-600 text-white font-bold py-2 rounded-lg text-[13px] transition"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {canAttack && (
                    <button
                      onClick={() => {
                        selectCard({ ...card, _zone: "swamp" });
                        setZoomedCard(null);
                      }}
                      className="flex-1 bg-red-800 hover:bg-red-700 border border-red-600 text-white font-bold py-2 rounded-lg text-[13px] transition"
                    >
                      Attack
                    </button>
                  )}
                  {canPlay && (
                    <button
                      onClick={() => {
                        if (card.type === "Creature") {
                          selectCard(card);
                        } else {
                          playCard(card.uid);
                        }
                        setZoomedCard(null);
                      }}
                      className="flex-1 bg-green-800 hover:bg-green-700 border border-green-600 text-white font-bold py-2 rounded-lg text-[13px] transition"
                    >
                      {card.type === "Creature" ? "Select to Place" : "Play"}
                    </button>
                  )}
                  {canDiscard && (
                    <button
                      onClick={() => setConfirmAction("discard")}
                      className="flex-1 bg-red-900/80 hover:bg-red-800 border border-red-700 text-red-200 font-bold py-2 rounded-lg text-[13px] transition"
                    >
                      Discard
                    </button>
                  )}
                  {canRecycle && (
                    <button
                      onClick={() => setConfirmAction("recycle")}
                      disabled={!canAffordRecycle}
                      className={`flex-1 border font-bold py-2 rounded-lg text-[13px] transition ${
                        canAffordRecycle
                          ? "bg-purple-900/80 hover:bg-purple-800 border-purple-700 text-purple-200"
                          : "bg-gray-800 border-gray-600 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      Recycle ({recycleSPCost} SP, +
                      {Math.max(
                        0,
                        (card.defence || 0) -
                          (card._defenceDamage || 0) +
                          (card._defenceBuff || 0) +
                          (card._tempShield || 0),
                      )}{" "}
                      shield)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Close button */}
          <button
            onClick={() => setZoomedCard(null)}
            className="w-full shrink-0 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 text-[14px] transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Desktop: side panel
  return (
    <div
      className={`fixed right-0 top-0 bottom-0 w-[260px] z-40 flex flex-col shadow-2xl border-l-2 bg-gray-950/95 animate-slide-in-right ${
        isTutorialHighlight
          ? "border-[var(--color-gold)] shadow-[0_0_20px_rgba(212,175,55,0.5)]"
          : "border-gray-700"
      }`}
    >
      {/* Close button */}
      <button
        onClick={() => setZoomedCard(null)}
        className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center text-xl text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg z-50 transition"
        aria-label="Close"
      >
        X
      </button>

      {/* Card art — cropped to artwork only */}
      {card.image && (
        <img
          src={`/cards/${card.image}`}
          alt={card.name}
          className="w-full shrink-0"
          style={{ clipPath: "inset(0 0 32% 0)" }}
          draggable={false}
        />
      )}

      {/* Card info */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Name + type */}
        <div>
          <h3 className="font-display text-[18px] text-white leading-tight">
            {card.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[14px]">{TYPE_ICON[card.type]}</span>
            <span className="text-[14px] text-gray-400">{card.type}</span>
            {card.cost !== undefined && (
              <span
                className={`text-[14px] ml-auto font-bold ${effectiveCost === 0 ? "text-green-400" : costModified ? "text-red-400" : "text-blue-300"}`}
              >
                {effectiveCost === 0 ? "FREE" : `${effectiveCost} AP`}
              </span>
            )}
          </div>
        </div>

        {/* Stats with bars */}
        {card.type === "Creature" &&
          (() => {
            const currentAtk = (card.attack || 0) + (card._attackBuff || 0);
            const currentHP = Math.max(
              0,
              (card.defence || 0) -
                (card._defenceDamage || 0) +
                (card._defenceBuff || 0) +
                (card._tempShield || 0),
            );
            const baseHP = card.defence || 0;
            return (
              <div className="space-y-2">
                <StatBar
                  label="Attack"
                  value={currentAtk}
                  max={maxAtk}
                  color="bg-red-500"
                  buffed={card._attackBuff > 0}
                />
                <StatBar
                  label="Health"
                  value={currentHP}
                  max={baseHP || 1}
                  color="bg-blue-500"
                  damaged={card._defenceDamage > 0}
                  suffix={` / ${baseHP}`}
                />
                <StatBar
                  label="SP"
                  value={card.sp ?? 0}
                  max={maxSp}
                  color="bg-yellow-500"
                />
              </div>
            );
          })()}

        {/* Armour info */}
        {card.type === "Armour" && (
          <div className="text-[14px] text-gray-300 space-y-1">
            <div>
              Slot: <span className="text-white capitalize">{card.slot}</span>
            </div>
            <div>
              Set:{" "}
              <span className="text-purple-300 capitalize">{card.set}</span>
            </div>
            {card.shieldAmount && (
              <div>
                Shield:{" "}
                <span className="text-green-400">+{card.shieldAmount}</span>
              </div>
            )}
            {card.incomeAmount && (
              <div>
                Income:{" "}
                <span className="text-yellow-400">
                  +{card.incomeAmount} SP/turn
                </span>
              </div>
            )}
            {card.discountAmount && (
              <div>
                Discount:{" "}
                <span className="text-blue-400">-{card.discountAmount} SP</span>
              </div>
            )}
            {card.blockedType && (
              <div>
                Blocks: <span className="text-red-400">{card.blockedType}</span>
              </div>
            )}
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
            {hasActivatedAbility(card.abilityId)
              ? "Activated ability (use on your turn)"
              : "Special ability"}
          </div>
        )}

        {/* Status effects */}
        {(card._silenced ||
          card._stonerShield ||
          card._invisible ||
          card._snaccReturn) && (
          <div className="border-t border-gray-800 pt-2 space-y-1">
            {card._silenced && (
              <div className="text-[12px] text-red-400">
                {ICONS.muted} Silenced
              </div>
            )}
            {card._stonerShield && (
              <div className="text-[12px] text-green-400">
                {ICONS.shield} Shield Active
              </div>
            )}
            {card._invisible && (
              <div className="text-[12px] text-gray-400">
                {ICONS.ghost} Invisible
              </div>
            )}
            {card._snaccReturn && (
              <div className="text-[12px] text-purple-400">
                {ICONS.clock} Returns to owner next turn
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        {(canPlay || canDiscard || canRecycle || canAttack) && (
          <div className="border-t border-gray-800 pt-3">
            {confirmAction ? (
              <div className="bg-red-950 border border-red-700 rounded-lg p-3 space-y-2">
                <p className="text-[12px] text-red-200 text-center">
                  {confirmAction === "discard"
                    ? `Discard ${card.name}? This cannot be undone.`
                    : `Sacrifice ${card.name} for +${Math.max(0, (card.defence || 0) - (card._defenceDamage || 0) + (card._defenceBuff || 0) + (card._tempShield || 0))} shield? Costs ${recycleSPCost} SP. Cannot be undone.`}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-1.5 rounded text-[12px] transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      confirmAction === "discard"
                        ? discardCard(card.uid)
                        : recycleCreature(card.uid)
                    }
                    className="flex-1 bg-red-700 hover:bg-red-600 text-white font-bold py-1.5 rounded text-[12px] transition"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {canAttack && (
                  <button
                    onClick={() => {
                      selectCard({ ...card, _zone: "swamp" });
                      setZoomedCard(null);
                    }}
                    className="w-full bg-red-800 hover:bg-red-700 border border-red-600 text-white font-bold py-2 rounded-lg text-[12px] transition"
                  >
                    Attack
                  </button>
                )}
                {canPlay && (
                  <button
                    onClick={() => {
                      if (card.type === "Creature") {
                        selectCard(card);
                      } else {
                        playCard(card.uid);
                      }
                      setZoomedCard(null);
                    }}
                    className="w-full bg-green-800 hover:bg-green-700 border border-green-600 text-white font-bold py-2 rounded-lg text-[12px] transition"
                  >
                    {card.type === "Creature" ? "Select to Place" : "Play"}
                  </button>
                )}
                {canDiscard && (
                  <button
                    onClick={() => setConfirmAction("discard")}
                    className="w-full bg-red-900/80 hover:bg-red-800 border border-red-700 text-red-200 font-bold py-2 rounded-lg text-[12px] transition"
                  >
                    Discard from Hand
                  </button>
                )}
                {canRecycle && (
                  <button
                    onClick={() => setConfirmAction("recycle")}
                    disabled={!canAffordRecycle}
                    className={`w-full border font-bold py-2 rounded-lg text-[12px] transition ${
                      canAffordRecycle
                        ? "bg-purple-900/80 hover:bg-purple-800 border-purple-700 text-purple-200"
                        : "bg-gray-800 border-gray-600 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Recycle ({recycleSPCost} SP, +
                    {Math.max(
                      0,
                      (card.defence || 0) -
                        (card._defenceDamage || 0) +
                        (card._defenceBuff || 0) +
                        (card._tempShield || 0),
                    )}{" "}
                    shield)
                  </button>
                )}
              </div>
            )}
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
        <span
          className={`font-bold ${buffed ? "text-green-400" : damaged ? "text-red-400" : "text-white"}`}
        >
          {value}
          {suffix && (
            <span className="text-gray-500 font-normal">{suffix}</span>
          )}
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
