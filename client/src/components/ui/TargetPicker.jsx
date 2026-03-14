import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store.js';

export default function TargetPicker() {
  const { gameState, selectTarget } = useStore();
  const pending = gameState?.pendingTarget;
  const [multiSelected, setMultiSelected] = useState([]);
  const prevPromptRef = useRef(null);

  // Reset multi-selection when the target prompt changes
  useEffect(() => {
    const promptKey = pending?.prompt;
    if (promptKey !== prevPromptRef.current) {
      prevPromptRef.current = promptKey;
      setMultiSelected([]);
    }
  }, [pending?.prompt]);

  if (!pending) return null;

  const isPlayerTarget = pending.targetType === 'player';
  const isMultiTarget = pending.maxTargets && pending.maxTargets > 1;

  const handleSelect = (target) => {
    if (isMultiTarget) {
      setMultiSelected(prev => {
        const exists = prev.find(t => t.uid === target.uid);
        if (exists) return prev.filter(t => t.uid !== target.uid);
        if (prev.length >= pending.maxTargets) return prev;
        return [...prev, target];
      });
    } else {
      selectTarget(target.ownerId, target.uid);
    }
  };

  const handleConfirmMulti = () => {
    if (multiSelected.length === 0) return;
    const targets = multiSelected.map(t => ({
      targetOwnerId: t.ownerId,
      targetUid: t.uid,
    }));
    selectTarget(
      multiSelected[0].ownerId,
      multiSelected[0].uid,
      targets
    );
    setMultiSelected([]);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 pointer-events-auto">
      <div className="bg-gray-900 border border-[var(--color-gold)] rounded-xl p-6 max-w-md shadow-2xl">
        <h3 className="text-xl font-display text-[var(--color-gold)] mb-3">Select Target</h3>
        <p className="text-[14px] text-gray-300 mb-4">{pending.prompt}</p>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {pending.validTargets.map((target) => {
            const isMultiSel = multiSelected.some(t => t.uid === target.uid);
            return (
              <button
                key={target.uid}
                onClick={() => handleSelect(target)}
                className={`w-full text-left border rounded-lg p-3 transition flex items-center justify-between ${
                  isMultiSel
                    ? 'bg-[var(--color-gold)]/20 border-[var(--color-gold)]'
                    : 'bg-gray-800 hover:bg-red-900/50 border-gray-700 hover:border-red-500'
                }`}
              >
                <span className="text-white font-medium text-[14px]">{target.name}</span>
                <span className="text-gray-400 text-[12px]">
                  {isPlayerTarget
                    ? `${gameState.players[target.ownerId]?.sp || 0} SP`
                    : target.slot
                      ? `${gameState.players[target.ownerId]?.name}'s ${target.slot} armour`
                      : `${gameState.players[target.ownerId]?.name}'s creature`
                  }
                </span>
              </button>
            );
          })}
        </div>

        {isMultiTarget && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[12px] text-gray-400">
              Selected: {multiSelected.length}/{pending.maxTargets}
            </span>
            <button
              onClick={handleConfirmMulti}
              disabled={multiSelected.length === 0}
              className="bg-[var(--color-gold)] hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold py-2 px-4 rounded-lg transition text-[14px]"
            >
              Confirm
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
