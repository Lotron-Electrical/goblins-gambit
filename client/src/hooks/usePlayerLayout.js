/**
 * Multi-player layout hook.
 * Returns position map for opponent placement based on player count.
 */

import { useMemo } from 'react';

/**
 * @param {string[]} turnOrder - all player IDs in turn order
 * @param {string} myId - this player's ID
 * @returns {{ positions: Object<string, string>, layout: string }}
 *   positions maps playerId -> 'top' | 'top-left' | 'top-right' | 'left' | 'right'
 *   layout is '2p' | '3p' | '4p' | '5p' | '6p'
 */
export function usePlayerLayout(turnOrder, myId) {
  return useMemo(() => {
    const opponents = turnOrder.filter(id => id !== myId);
    const count = opponents.length;
    const positions = {};

    switch (count) {
      case 1:
        // 2 players: opponent top
        positions[opponents[0]] = 'top';
        return { positions, layout: '2p' };

      case 2:
        // 3 players: 2 across top
        positions[opponents[0]] = 'top-left';
        positions[opponents[1]] = 'top-right';
        return { positions, layout: '3p' };

      case 3:
        // 4 players: 1 left, 1 top, 1 right
        positions[opponents[0]] = 'left';
        positions[opponents[1]] = 'top';
        positions[opponents[2]] = 'right';
        return { positions, layout: '4p' };

      case 4:
        // 5 players: 1 left, 2 top, 1 right
        positions[opponents[0]] = 'left';
        positions[opponents[1]] = 'top-left';
        positions[opponents[2]] = 'top-right';
        positions[opponents[3]] = 'right';
        return { positions, layout: '5p' };

      case 5:
        // 6 players: 1 left, 3 top, 1 right
        positions[opponents[0]] = 'left';
        positions[opponents[1]] = 'top-left';
        positions[opponents[2]] = 'top';
        positions[opponents[3]] = 'top-right';
        positions[opponents[4]] = 'right';
        return { positions, layout: '6p' };

      default:
        opponents.forEach(id => { positions[id] = 'top'; });
        return { positions, layout: '2p' };
    }
  }, [turnOrder, myId]);
}
