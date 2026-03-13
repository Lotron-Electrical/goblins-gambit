import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../../store.js';

const MAX_LOG_ENTRIES = 50;

function formatEvent(evt, players) {
  const name = (id) => players[id]?.name || 'Unknown';

  switch (evt.type) {
    case 'card_played':
      return `${name(evt.playerId)} played ${evt.card?.name || 'a card'}`;
    case 'draw_card':
      return `${name(evt.playerId)} drew ${evt.count || 1} card${(evt.count || 1) > 1 ? 's' : ''}`;
    case 'attack':
      return `Attack!`;
    case 'damage':
      return `${evt.amount} damage dealt`;
    case 'destroy':
      return `${evt.reason || 'A card was destroyed'}`;
    case 'sp_change':
      if (evt.amount > 0) return `${name(evt.playerId)} gained ${evt.amount} SP${evt.reason ? ` (${evt.reason})` : ''}`;
      return `${name(evt.playerId)} spent ${Math.abs(evt.amount)} SP${evt.reason ? ` (${evt.reason})` : ''}`;
    case 'buff':
      return evt.text || 'Buff applied';
    case 'equip_armour':
      return `${name(evt.playerId)} equipped ${evt.card?.name || 'armour'}`;
    case 'set_complete':
      return `${name(evt.playerId)} completed the ${evt.set} set!`;
    case 'turn_start':
      return `--- ${name(evt.playerId)}'s turn ---`;
    case 'turn_skipped':
      return `${name(evt.playerId)}'s turn skipped (Lagg!)`;
    case 'card_moved':
      return `${evt.reason || 'Card moved'}`;
    case 'card_discarded':
      return `Card discarded${evt.reason ? ` (${evt.reason})` : ''}`;
    case 'card_stolen':
      return `${name(evt.to)} stole ${evt.card?.name || 'a card'} from ${name(evt.from)}`;
    case 'hand_revealed':
      return `${name(evt.viewerId)} revealed ${name(evt.targetPlayerId)}'s hand`;
    case 'card_recovered':
      return `${name(evt.playerId)} recovered ${evt.card?.name || 'a card'}`;
    case 'dice_roll':
      return `Dice roll: ${evt.dice?.join(' + ')} = ${evt.result}`;
    case 'game_over':
      return `${evt.winnerName} wins!`;
    default:
      return null;
  }
}

export default function ActivityLog() {
  const { gameState } = useStore();
  const [entries, setEntries] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef(null);
  const prevAnimationsRef = useRef(null);

  useEffect(() => {
    if (!gameState?.animations || gameState.animations.length === 0) return;
    // Each action produces a new array reference — process the full batch
    if (gameState.animations === prevAnimationsRef.current) return;
    prevAnimationsRef.current = gameState.animations;

    const newEntries = [];
    for (const evt of gameState.animations) {
      const text = formatEvent(evt, gameState.players);
      if (text) {
        newEntries.push({
          id: Date.now() + Math.random(),
          text,
          type: evt.type,
          timestamp: Date.now(),
        });
      }
    }

    if (newEntries.length > 0) {
      setEntries(prev => [...prev, ...newEntries].slice(-MAX_LOG_ENTRIES));
    }
  }, [gameState?.animations, gameState?.players]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const getColor = (type) => {
    switch (type) {
      case 'turn_start': return 'text-[var(--color-gold)]';
      case 'turn_skipped': return 'text-orange-400';
      case 'damage':
      case 'destroy': return 'text-red-400';
      case 'sp_change': return 'text-yellow-400';
      case 'card_played': return 'text-green-300';
      case 'buff':
      case 'equip_armour':
      case 'set_complete': return 'text-blue-300';
      case 'game_over': return 'text-[var(--color-gold)] font-bold';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="fixed bottom-0 left-0 z-10 pointer-events-auto" style={{ width: '260px' }}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="text-[11px] text-gray-500 hover:text-gray-300 mb-1 transition"
      >
        {collapsed ? 'Show Log' : 'Hide Log'}
      </button>
      {!collapsed && (
        <div
          ref={scrollRef}
          className="bg-gray-950/80 border border-gray-800 rounded-lg p-2 max-h-[200px] overflow-y-auto"
        >
          {entries.length === 0 && (
            <div className="text-gray-600 text-[11px]">Waiting for action...</div>
          )}
          {entries.map((entry) => (
            <div key={entry.id} className={`text-[11px] leading-tight py-0.5 ${getColor(entry.type)}`}>
              {entry.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
