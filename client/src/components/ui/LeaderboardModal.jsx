import { useState, useEffect } from 'react';
import { getLeaderboard } from '../../api.js';

export default function LeaderboardModal({ onClose }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard()
      .then(data => setPlayers(data.players || []))
      .catch(() => setPlayers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-gray-950 border-2 border-[var(--color-gold)] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gray-900 px-4 py-3 flex items-center justify-between border-b border-gray-800">
          <h2 className="font-display text-xl text-[var(--color-gold)]">Leaderboard</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg font-bold">X</button>
        </div>

        <div className="p-4 max-h-[400px] overflow-y-auto">
          {loading ? (
            <p className="text-gray-400 text-center py-4">Loading...</p>
          ) : players.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No players yet.</p>
          ) : (
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2 px-2">#</th>
                  <th className="text-left py-2 px-2">Player</th>
                  <th className="text-right py-2 px-2">Wins</th>
                  <th className="text-right py-2 px-2">Played</th>
                  <th className="text-right py-2 px-2">Win%</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => {
                  const winRate = p.gamesPlayed > 0 ? Math.round((p.wins / p.gamesPlayed) * 100) : 0;
                  return (
                    <tr key={p.username} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                      <td className={`py-2 px-2 font-bold ${i < 3 ? 'text-[var(--color-gold)]' : 'text-gray-500'}`}>
                        {i + 1}
                      </td>
                      <td className="py-2 px-2 text-white">{p.username}</td>
                      <td className="py-2 px-2 text-right text-green-400">{p.wins}</td>
                      <td className="py-2 px-2 text-right text-gray-300">{p.gamesPlayed}</td>
                      <td className="py-2 px-2 text-right text-blue-300">{winRate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
