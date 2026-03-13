import { useState } from 'react';
import { useStore } from '../../store.js';
import { soundManager } from '../../audio/SoundManager.js';
import { ICONS } from './icons.js';

export default function GameHUD() {
  const { gameState, setHelpOpen, muted, setMuted } = useStore();
  const [musicOn, setMusicOn] = useState(true);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  if (!gameState) return null;

  const myPlayer = gameState.players[gameState.myId];
  const isMyTurn = gameState.currentPlayerId === gameState.myId;
  const isEarlyTurn = gameState.turnNumber <= 3 && isMyTurn;

  const handleMuteToggle = () => {
    soundManager.init();
    const newMuted = soundManager.toggleMute();
    setMuted(newMuted);
  };

  const handleMusicToggle = () => {
    if (musicOn) {
      soundManager.stopMusic();
    } else {
      soundManager.startMusic();
    }
    setMusicOn(!musicOn);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-20 pointer-events-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-950/90 border-b border-gray-800 pointer-events-auto">
        <div className="flex items-center gap-4">
          <span className="font-display text-[var(--color-gold)] text-lg">Goblin's Gambit</span>
          <span className="text-gray-500 text-[12px]">Turn {gameState.turnNumber}</span>
          <span className="text-gray-500 text-[12px]">Deck: {gameState.deckCount}</span>
          <span className="text-gray-500 text-[12px]">Grave: {gameState.graveyardCount}</span>
        </div>
        <div className="flex items-center gap-3">
          {isMyTurn && (
            <span className="bg-[var(--color-gold)]/90 text-black font-display text-sm px-3 py-0.5 rounded shadow animate-pulse">
              YOUR TURN
            </span>
          )}
          <span className="text-yellow-400 font-bold text-[16px]">{myPlayer.sp} / {gameState.winSP} SP</span>
          <span className="text-blue-300 font-bold text-[14px]">{myPlayer.ap} AP</span>
          {/* Help button */}
          <button
            onClick={() => setHelpOpen(true)}
            className="w-8 h-8 flex items-center justify-center text-[14px] text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            title="Help"
          >
            ?
          </button>
          {/* Mute SFX button */}
          <button
            onClick={handleMuteToggle}
            className="w-8 h-8 flex items-center justify-center text-[14px] text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            title={muted ? 'Unmute SFX' : 'Mute SFX'}
          >
            {muted ? ICONS.muted : ICONS.sound}
          </button>
          {/* Music toggle */}
          <button
            onClick={handleMusicToggle}
            className={`w-8 h-8 flex items-center justify-center text-[14px] ${musicOn ? 'text-yellow-400' : 'text-gray-400'} hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition`}
            title={musicOn ? 'Stop music' : 'Play music'}
          >
            {musicOn ? ICONS.music : ICONS.musicOff}
          </button>
          {/* Feedback button */}
          <button
            onClick={() => setFeedbackOpen(true)}
            className="w-8 h-8 flex items-center justify-center text-[14px] text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            title="Report bug / Request feature"
          >
            {ICONS.bug}
          </button>
        </div>
      </div>

      {/* First-turn instruction */}
      {isEarlyTurn && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-gray-900/90 border border-gray-700 rounded-lg px-4 py-2 text-[13px] text-gray-300 text-center max-w-sm">
            Draw cards, play creatures to your swamp, and attack to earn SP!
          </div>
        </div>
      )}

      {/* Action buttons moved to HandBar */}

      {/* SP Progress bar */}
      <div className="fixed top-12 left-0 right-0 pointer-events-none">
        <div className="h-1 bg-gray-800">
          <div
            className="h-full bg-gradient-to-r from-[var(--color-gold)] to-yellow-400 transition-all duration-500"
            style={{ width: `${Math.min(100, (myPlayer.sp / gameState.winSP) * 100)}%` }}
          />
        </div>
      </div>

      {/* Feedback modal */}
      {feedbackOpen && (
        <FeedbackModal
          gameState={gameState}
          onClose={() => setFeedbackOpen(false)}
        />
      )}
    </div>
  );
}

function FeedbackModal({ gameState, onClose }) {
  const [type, setType] = useState('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!title.trim()) return;

    // Build GitHub issue URL with pre-filled content
    const label = type === 'bug' ? 'bug' : 'enhancement';
    const gameContext = [
      `**Turn:** ${gameState.turnNumber}`,
      `**Players:** ${Object.values(gameState.players).map(p => p.name).join(', ')}`,
      `**My SP:** ${gameState.players[gameState.myId]?.sp}`,
      `**My creatures:** ${gameState.players[gameState.myId]?.swamp?.map(c => c.name).join(', ') || 'none'}`,
    ].join('\n');

    const body = `## Description\n${description || '_No description provided_'}\n\n## Game Context\n${gameContext}\n\n---\n_Submitted from in-game feedback_`;

    const url = `https://github.com/Lotron-Electrical/goblins-gambit/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=${encodeURIComponent(label)}`;
    window.open(url, '_blank');
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 pointer-events-auto" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        {submitted ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-3">{ICONS.sparkles}</div>
            <h3 className="text-white text-lg font-bold mb-2">Thanks for the feedback!</h3>
            <p className="text-gray-400 text-sm mb-4">Your issue should be opening on GitHub now.</p>
            <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition">
              Close
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-white text-lg font-bold mb-4">Report a Bug or Request a Feature</h3>

            {/* Type selector */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setType('bug')}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${
                  type === 'bug'
                    ? 'bg-red-700 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {ICONS.bug} Bug Report
              </button>
              <button
                onClick={() => setType('feature')}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${
                  type === 'feature'
                    ? 'bg-purple-700 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {ICONS.sparkles} Feature Request
              </button>
            </div>

            {/* Title */}
            <input
              type="text"
              placeholder={type === 'bug' ? 'What went wrong?' : 'What would you like to see?'}
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm mb-3 focus:outline-none focus:border-[var(--color-gold)]"
              autoFocus
            />

            {/* Description */}
            <textarea
              placeholder="Add any details... (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm mb-3 focus:outline-none focus:border-[var(--color-gold)] resize-none"
            />

            <p className="text-gray-500 text-[11px] mb-4">
              This will open a GitHub issue with your game context automatically attached.
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!title.trim()}
                className="flex-1 bg-[var(--color-gold)] hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold py-2 rounded-lg transition"
              >
                Submit
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
