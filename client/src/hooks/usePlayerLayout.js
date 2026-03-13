/**
 * Multi-player layout hook.
 * Returns layout string based on player count.
 */

import { useMemo } from 'react';

/**
 * @param {string[]} turnOrder - all player IDs in turn order
 * @param {string} myId - this player's ID
 * @returns {{ layout: string }}
 */
export function usePlayerLayout(turnOrder, myId) {
  return useMemo(() => {
    const count = turnOrder.filter(id => id !== myId).length;
    const layout = count <= 1 ? '2p' : `${count + 1}p`;
    return { layout };
  }, [turnOrder, myId]);
}
