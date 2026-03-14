import { useState, useRef, useCallback } from 'react';
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
      for (const [, cs] of Object.entries(ps.creatureStats)) {
        if (cs.kills > bestKills) {
          bestKills = cs.kills;
          bestCreature = cs.name;
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

function AwardBadge({ icon, title, detail, compact }) {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 bg-gray-800/80 rounded px-2 py-1">
        <span className="text-sm">{icon}</span>
        <span className="text-[var(--color-gold)] font-display text-[10px]">{title}</span>
        <span className="text-gray-400 text-[10px]">{detail}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center bg-gray-800/80 rounded-lg px-4 py-3 min-w-[140px]">
      <span className="text-2xl mb-1">{icon}</span>
      <span className="text-[var(--color-gold)] font-display text-sm">{title}</span>
      <span className="text-gray-300 text-xs text-center">{detail}</span>
    </div>
  );
}

function MobileGameOver({ isMe, winnerPlayer, players, winnerId, gameStats, rankLabels, awards, hasAwards, playerNameById, leaveRoom }) {
  const totalPages = hasAwards ? 3 : 2;
  const [page, setPage] = useState(0);
  const touchStartX = useRef(null);

  const goNext = useCallback(() => setPage(p => Math.min(p + 1, totalPages - 1)), [totalPages]);
  const goPrev = useCallback(() => setPage(p => Math.max(p - 1, 0)), []);

  const onTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 50) {
      if (dx < 0) goNext();
      else goPrev();
    }
  }, [goNext, goPrev]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3">
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-full p-4 flex flex-col items-center"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Header — always visible */}
        <div className="text-center mb-3">
          <div className={`font-display text-3xl ${isMe ? 'text-[var(--color-gold-bright)]' : 'text-red-500'}`}>
            {isMe ? 'VICTORY!' : 'DEFEAT'}
          </div>
          <div className="text-gray-300 text-sm">
            {winnerPlayer.name} wins with {winnerPlayer.sp} SP
          </div>
        </div>

        {/* Page content */}
        <div className="w-full flex-1 min-h-[200px]">
          {page === 0 && (
            <div className="w-full">
              <h3 className="font-display text-gray-400 uppercase tracking-wider text-xs mb-2">Rankings</h3>
              <div className="flex flex-col gap-1">
                {players.map((p, i) => {
                  const isWinner = p.id === winnerId;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between rounded-lg px-3 py-1.5 ${
                        isWinner
                          ? 'bg-[var(--color-gold)]/15 border border-[var(--color-gold)]/40'
                          : 'bg-gray-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`font-display text-sm ${isWinner ? 'text-[var(--color-gold)]' : 'text-gray-500'}`}>
                          {rankLabels[i] || `${i + 1}th`}
                        </span>
                        <span className={`text-sm ${isWinner ? 'text-[var(--color-gold)] font-bold' : 'text-white'}`}>
                          {p.name}
                        </span>
                      </div>
                      <span className={`font-display text-sm ${isWinner ? 'text-[var(--color-gold)]' : 'text-gray-300'}`}>
                        {p.sp} SP
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {page === 1 && (
            <div className="w-full">
              <h3 className="font-display text-gray-400 uppercase tracking-wider text-xs mb-2">Stats</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-700">
                    <th className="text-left py-1.5 pr-1">Player</th>
                    <th className="text-center py-1.5 px-1">Cards</th>
                    <th className="text-center py-1.5 px-1">Kills</th>
                    <th className="text-center py-1.5 px-1">Dmg</th>
                    <th className="text-center py-1.5 pl-1">SP</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => {
                    const ps = gameStats[p.id] || {};
                    const isWinner = p.id === winnerId;
                    return (
                      <tr
                        key={p.id}
                        className={`border-b border-gray-800/50 ${isWinner ? 'text-[var(--color-gold)]' : 'text-gray-300'}`}
                      >
                        <td className={`py-1.5 pr-1 truncate max-w-[100px] ${isWinner ? 'font-bold' : 'font-medium'}`}>{p.name}</td>
                        <td className="text-center py-1.5 px-1">{ps.cardsPlayed ?? 0}</td>
                        <td className="text-center py-1.5 px-1">{ps.creaturesKilled ?? 0}</td>
                        <td className="text-center py-1.5 px-1">{ps.damageDealt ?? 0}</td>
                        <td className="text-center py-1.5 pl-1">{ps.spEarned ?? p.sp}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {page === 2 && hasAwards && (
            <div className="w-full">
              <h3 className="font-display text-gray-400 uppercase tracking-wider text-xs mb-3">Awards</h3>
              <div className="flex flex-col gap-2 items-center">
                {awards.mvpCreature && (
                  <AwardBadge icon="⚔️" title="MVP Creature" detail={`${awards.mvpCreature.name} (${awards.mvpCreature.kills} kills)`} />
                )}
                {awards.mostDestructive && (
                  <AwardBadge icon="💥" title="Most Destructive" detail={`${playerNameById[awards.mostDestructive.playerId]} (${awards.mostDestructive.damage} dmg)`} />
                )}
                {awards.cardShark && (
                  <AwardBadge icon="🃏" title="Card Shark" detail={`${playerNameById[awards.cardShark.playerId]} (${awards.cardShark.cards} cards)`} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation: arrows + dots */}
        <div className="flex items-center justify-center gap-4 mt-3 mb-3">
          <button
            onClick={goPrev}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition text-sm font-bold ${
              page > 0 ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-800/40 text-gray-700'
            }`}
            disabled={page === 0}
          >
            {'<'}
          </button>
          <div className="flex gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-2 h-2 rounded-full transition ${
                  i === page ? 'bg-[var(--color-gold)]' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
          <button
            onClick={goNext}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition text-sm font-bold ${
              page < totalPages - 1 ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-800/40 text-gray-700'
            }`}
            disabled={page === totalPages - 1}
          >
            {'>'}
          </button>
        </div>

        {/* Play Again — always visible */}
        <button
          onClick={() => leaveRoom()}
          className="bg-[var(--color-gold)] hover:bg-yellow-400 text-black font-bold rounded-lg transition py-2.5 px-8 text-sm w-full"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}

export default function GameOverModal() {
  const { gameState, gameStats, leaveRoom } = useStore();
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
            onClick={() => leaveRoom()}
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

  const hasAwards = awards.mvpCreature || awards.mostDestructive || awards.cardShark;

  if (isMobile) {
    return (
      <MobileGameOver
        isMe={isMe}
        winnerPlayer={winnerPlayer}
        players={players}
        winnerId={winnerId}
        gameStats={gameStats}
        rankLabels={rankLabels}
        awards={awards}
        hasAwards={hasAwards}
        playerNameById={playerNameById}
        leaveRoom={leaveRoom}
      />
    );
  }

  // Desktop layout
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl p-8 flex flex-col items-center gap-6">
        {/* Header */}
        <div className="text-center">
          <div className={`font-display text-6xl mb-1 ${isMe ? 'text-[var(--color-gold-bright)]' : 'text-red-500'}`}>
            {isMe ? 'VICTORY!' : 'DEFEAT'}
          </div>
          <div className="text-gray-300 text-xl">
            {winnerPlayer.name} wins with {winnerPlayer.sp} SP
          </div>
        </div>

        {/* Player Rankings */}
        <div className="w-full">
          <h3 className="font-display text-gray-400 uppercase tracking-wider mb-2 text-sm">Rankings</h3>
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
                    <span className={`font-display text-base ${isWinner ? 'text-[var(--color-gold)]' : 'text-gray-500'}`}>
                      {rankLabels[i] || `${i + 1}th`}
                    </span>
                    <span className={`text-base ${isWinner ? 'text-[var(--color-gold)] font-bold' : 'text-white'}`}>
                      {p.name}
                    </span>
                  </div>
                  <span className={`font-display text-lg ${isWinner ? 'text-[var(--color-gold)]' : 'text-gray-300'}`}>
                    {p.sp} SP
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats Table */}
        <div className="w-full overflow-x-auto">
          <h3 className="font-display text-gray-400 uppercase tracking-wider mb-2 text-sm">Stats</h3>
          <table className="w-full text-sm">
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
            <h3 className="font-display text-gray-400 uppercase tracking-wider mb-2 text-sm">Awards</h3>
            <div className="flex gap-3 flex-row justify-center flex-wrap">
              {awards.mvpCreature && (
                <AwardBadge icon="⚔️" title="MVP Creature" detail={`${awards.mvpCreature.name} (${awards.mvpCreature.kills} kills)`} />
              )}
              {awards.mostDestructive && (
                <AwardBadge icon="💥" title="Most Destructive" detail={`${playerNameById[awards.mostDestructive.playerId]} (${awards.mostDestructive.damage} dmg)`} />
              )}
              {awards.cardShark && (
                <AwardBadge icon="🃏" title="Card Shark" detail={`${playerNameById[awards.cardShark.playerId]} (${awards.cardShark.cards} cards)`} />
              )}
            </div>
          </div>
        )}

        {/* Play Again */}
        <button
          onClick={() => leaveRoom()}
          className="bg-[var(--color-gold)] hover:bg-yellow-400 text-black font-bold rounded-lg transition py-3 px-8 text-lg"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
