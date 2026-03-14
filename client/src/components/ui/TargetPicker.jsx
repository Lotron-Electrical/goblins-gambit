import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';

export default function TargetPicker({ mobileCenterY }) {
  const { gameState, selectTarget } = useStore();
  const pending = gameState?.pendingTarget;
  const isMobile = useIsMobile();
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
    <div className="fixed inset-0 z-40 bg-black/50 pointer-events-auto">
      <div
        className={`absolute p-3 ${
          mobileCenterY
            ? 'left-0 right-0 -translate-y-1/2 flex justify-center'
            : 'inset-0 flex items-center justify-center'
        }`}
        style={mobileCenterY ? { top: `${mobileCenterY}px` } : undefined}
      >
      <div className={`bg-gray-900 border border-[var(--color-gold)] rounded-xl shadow-2xl w-full ${
        isMobile ? 'p-3 max-w-sm' : 'p-6 max-w-md'
      }`}>
        <h3 className={`font-display text-[var(--color-gold)] ${isMobile ? 'text-lg mb-2' : 'text-xl mb-3'}`}>Select Target</h3>
        <p className={`text-gray-300 ${isMobile ? 'text-[13px] mb-3' : 'text-[14px] mb-4'}`}>{pending.prompt}</p>

        <div className={`space-y-2 overflow-y-auto ${isMobile ? 'max-h-[250px]' : 'max-h-[300px]'}`}>
          {pending.validTargets.map((target) => {
            const isMultiSel = multiSelected.some(t => t.uid === target.uid);
            return (
              <button
                key={target.uid}
                onClick={() => handleSelect(target)}
                className={`w-full text-left border rounded-lg transition flex items-center justify-between ${
                  isMobile ? 'p-3.5' : 'p-3'
                } ${
                  isMultiSel
                    ? 'bg-[var(--color-gold)]/20 border-[var(--color-gold)]'
                    : 'bg-gray-800 hover:bg-red-900/50 border-gray-700 hover:border-red-500'
                }`}
              >
                <span className={`text-white font-medium ${isMobile ? 'text-[13px]' : 'text-[14px]'}`}>{target.name}</span>
                <span className={`text-gray-400 ${isMobile ? 'text-[11px]' : 'text-[12px]'}`}>
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
    </div>
  );
}
