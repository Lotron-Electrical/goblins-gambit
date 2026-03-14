import { useStore } from '../../store.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';

function computeAwards(stats) {
  if (!stats) return {};
  const awards = {};

  // MVP Creature — creature with most kills across all players
  let bestCreature = null;
  let bestKills = 0;
  for (const [, ps] of Object.entries(stats)) {
    if (ps.creatureStats) {
      for (const [name, cs] of Object.entries(ps.creatureStats)) {
        if (cs.kills > bestKills) {
          bestKills = cs.kills;
          bestCreature = name;
        }
      }
    }
  }
  if (bestCreature) awards.mvpCreature = { name: bestCreature, kills: bestKills };

  // Most Destructive — player who dealt the most damage
  let topDmgId = null;
  let topDmg = 0;
  for (const [id, ps] of Object.entries(stats)) {
    const dmg = ps.damageDealt ?? 0;
    if (dmg > topDmg) {
      topDmg = dmg;
      topDmgId = id;
    }
  }
  if (topDmgId) awards.mostDestructive = { playerId: topDmgId, damage: topDmg };

  // Card Shark — player who played the most cards
  let topCardsId = null;
  let topCards = 0;
  for (const [id, ps] of Object.entries(stats)) {
    const c = ps.cardsPlayed ?? 0;
    if (c > topCards) {
      topCards = c;
      topCardsId = id;
    }
  }
  if (topCardsId) awards.cardShark = { playerId: topCardsId, cards: topCards };

  return awards;
}

function AwardBadge({ icon, title, detail }) {
  return (
    <div className="flex flex-col items-center bg-gray-800/80 rounded-lg px-4 py-3 min-w-[140px]">
      <span className="text-2xl mb-1">{icon}</span>
      <span className="text-[var(--color-gold)] font-display text-sm">{title}</span>
      <span className="text-gray-300 text-xs text-center">{detail}</span>
    </div>
  );
}

export default function GameOverModal() {
  const { gameState, gameStats } = useStore();
  const isMobile = useIsMobile();

  if (!gameState?.winner) return null;

  const winnerId = gameState.winner;
  const winnerPlayer = gameState.players[winnerId];
  const isMe = winnerId === gameState.myId;

  // If no stats, show basic fallback
  if (!gameStats) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="text-center">
          <div className={`text-6xl font-display mb-4 ${isMe ? 'text-[var(--color-gold-bright)]' : 'text-red-500'}`}>
            {isMe ? 'VICTORY!' : 'DEFEAT'}
          </div>
          <div className="text-2xl text-white mb-2">
            {winnerPlayer.name} wins with {winnerPlayer.sp} SP!
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 bg-[var(--color-gold)] hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-lg transition text-lg"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  // Build sorted player rankings by SP descending
  const players = Object.entries(gameState.players)
    .map(([id, p]) => ({ id, name: p.name, sp: p.sp }))
    .sort((a, b) => b.sp - a.sp);

  const awards = computeAwards(gameStats);
  const playerNameById = Object.fromEntries(players.map(p => [p.id, p.name]));

  const rankLabels = ['1st', '2nd', '3rd', '4th', '5th', '6th'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 overflow-y-auto">
      <div
        className={`bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full flex flex-col items-center ${
          isMobile ? 'max-w-full p-4 gap-4' : 'max-w-2xl p-8 gap-6'
        }`}
      >
        {/* Header */}
        <div className="text-center">
          <div
            className={`font-display mb-1 ${
              isMe ? 'text-[var(--color-gold-bright)]' : 'text-red-500'
            } ${isMobile ? 'text-4xl' : 'text-6xl'}`}
          >
            {isMe ? 'VICTORY!' : 'DEFEAT'}
          </div>
          <div className={`text-gray-300 ${isMobile ? 'text-base' : 'text-xl'}`}>
            {winnerPlayer.name} wins with {winnerPlayer.sp} SP
          </div>
        </div>

        {/* Player Rankings */}
        <div className="w-full">
          <h3 className={`font-display text-gray-400 uppercase tracking-wider mb-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            Rankings
          </h3>
          <div className="flex flex-col gap-1">
            {players.map((p, i) => {
              const isWinner = p.id === winnerId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                    isWinner
                      ? 'bg-[var(--color-gold)]/15 border border-[var(--color-gold)]/40'
                      : 'bg-gray-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-display ${isMobile ? 'text-sm' : 'text-base'} ${
                        isWinner ? 'text-[var(--color-gold)]' : 'text-gray-500'
                      }`}
                    >
                      {rankLabels[i] || `${i + 1}th`}
                    </span>
                    <span
                      className={`${isMobile ? 'text-sm' : 'text-base'} ${
                        isWinner ? 'text-[var(--color-gold)] font-bold' : 'text-white'
                      }`}
                    >
                      {p.name}
                    </span>
                  </div>
                  <span
                    className={`font-display ${isMobile ? 'text-sm' : 'text-lg'} ${
                      isWinner ? 'text-[var(--color-gold)]' : 'text-gray-300'
                    }`}
                  >
                    {p.sp} SP
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats Table */}
        <div className="w-full overflow-x-auto">
          <h3 className={`font-display text-gray-400 uppercase tracking-wider mb-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            Stats
          </h3>
          <table className={`w-full ${isMobile ? 'text-xs' : 'text-sm'}`}>
            <thead>
              <tr className="text-gray-500 border-b border-gray-700">
                <th className="text-left py-2 pr-2">Player</th>
                <th className="text-center py-2 px-2">Cards</th>
                <th className="text-center py-2 px-2">Kills</th>
                <th className="text-center py-2 px-2">Damage</th>
                <th className="text-center py-2 px-2">SP</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const ps = gameStats[p.id] || {};
                const isWinner = p.id === winnerId;
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-gray-800 ${isWinner ? 'text-[var(--color-gold)]' : 'text-gray-300'}`}
                  >
                    <td className="py-2 pr-2 font-medium truncate max-w-[120px]">{p.name}</td>
                    <td className="text-center py-2 px-2">{ps.cardsPlayed ?? 0}</td>
                    <td className="text-center py-2 px-2">{ps.creaturesKilled ?? 0}</td>
                    <td className="text-center py-2 px-2">{ps.damageDealt ?? 0}</td>
                    <td className="text-center py-2 px-2">{ps.spEarned ?? p.sp}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Awards */}
        {(awards.mvpCreature || awards.mostDestructive || awards.cardShark) && (
          <div className="w-full">
            <h3 className={`font-display text-gray-400 uppercase tracking-wider mb-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              Awards
            </h3>
            <div className={`flex gap-3 ${isMobile ? 'flex-col items-stretch' : 'flex-row justify-center flex-wrap'}`}>
              {awards.mvpCreature && (
                <AwardBadge
                  icon="⚔️"
                  title="MVP Creature"
                  detail={`${awards.mvpCreature.name} (${awards.mvpCreature.kills} kills)`}
                />
              )}
              {awards.mostDestructive && (
                <AwardBadge
                  icon="💥"
                  title="Most Destructive"
                  detail={`${playerNameById[awards.mostDestructive.playerId]} (${awards.mostDestructive.damage} dmg)`}
                />
              )}
              {awards.cardShark && (
                <AwardBadge
                  icon="🃏"
                  title="Card Shark"
                  detail={`${playerNameById[awards.cardShark.playerId]} (${awards.cardShark.cards} cards)`}
                />
              )}
            </div>
          </div>
        )}

        {/* Play Again */}
        <button
          onClick={() => window.location.reload()}
          className={`bg-[var(--color-gold)] hover:bg-yellow-400 text-black font-bold rounded-lg transition ${
            isMobile ? 'py-2.5 px-6 text-base' : 'py-3 px-8 text-lg'
          }`}
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
