import { useEffect } from 'react';
import { useStore } from './store.js';
import LobbyScreen from './screens/LobbyScreen.jsx';
import RoomScreen from './screens/RoomScreen.jsx';
import GameScreen from './screens/GameScreen.jsx';

export default function App() {
  const { screen, connected, error, clearError, connect } = useStore();

  useEffect(() => {
    connect();
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="min-h-screen">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-300 hover:text-white font-bold">X</button>
        </div>
      )}

      {!connected && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center">
          <div className="text-white text-xl font-display">Connecting to server...</div>
        </div>
      )}

      {screen === 'lobby' && <LobbyScreen />}
      {screen === 'room' && <RoomScreen />}
      {screen === 'game' && <GameScreen />}
    </div>
  );
}
