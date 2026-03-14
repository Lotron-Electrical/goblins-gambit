import { useEffect } from 'react';
import { useStore } from './store.js';
import LoginScreen from './screens/LoginScreen.jsx';
import LobbyScreen from './screens/LobbyScreen.jsx';
import RoomScreen from './screens/RoomScreen.jsx';
import GameScreen from './screens/GameScreen.jsx';
import TutorialScreen from './screens/TutorialScreen.jsx';

export default function App() {
  const { screen, connected, error, clearError, connect, authToken, loadProfile } = useStore();

  // Auto-login with saved token on mount
  useEffect(() => {
    if (authToken && authToken !== 'guest') {
      loadProfile();
    }
  }, []);

  useEffect(() => {
    if (authToken) connect();
  }, [authToken, connect]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // Show login screen if not authenticated
  if (!authToken) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-900/90 border border-amber-500 text-amber-100 px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <span className="text-amber-300 text-lg">!</span>
          <span>{error}</span>
          <button onClick={clearError} className="text-amber-400 hover:text-white font-bold">X</button>
        </div>
      )}

      {!connected && screen !== 'tutorial' && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center">
          <div className="text-white text-xl font-display">Connecting to server...</div>
        </div>
      )}

      {screen === 'lobby' && <LobbyScreen />}
      {screen === 'room' && <RoomScreen />}
      {screen === 'game' && <GameScreen />}
      {screen === 'tutorial' && <TutorialScreen />}
    </div>
  );
}
