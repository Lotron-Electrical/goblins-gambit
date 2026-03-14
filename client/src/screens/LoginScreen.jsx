import { useState } from 'react';
import { useStore } from '../store.js';
import SparkleParticles from '../components/ui/SparkleParticles.jsx';

export default function LoginScreen() {
  const { loginUser, registerUser, authLoading, authError, clearAuthError } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    if (mode === 'login') {
      loginUser(username.trim(), password);
    } else {
      registerUser(username.trim(), password);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      <SparkleParticles />
      <div className="text-center mb-8 relative z-10">
        <h1 className="text-3xl md:text-6xl font-display text-[var(--color-gold-bright)] drop-shadow-[0_0_30px_rgba(212,160,23,0.5)] mb-2">
          Goblin's Gambit
        </h1>
        <p className="text-gray-400 text-lg">A card game of cunning and chaos</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 relative z-10">
        <div>
          <label className="block text-gray-300 text-sm mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => { setUsername(e.target.value); clearAuthError(); }}
            placeholder="Enter username..."
            maxLength={20}
            autoComplete="username"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-[var(--color-gold)] transition"
          />
        </div>

        <div>
          <label className="block text-gray-300 text-sm mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearAuthError(); }}
            placeholder="Enter password..."
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-[var(--color-gold)] transition"
          />
        </div>

        {authError && (
          <p className="text-red-400 text-sm text-center">{authError}</p>
        )}

        <button
          type="submit"
          disabled={authLoading || !username.trim() || !password.trim()}
          className="w-full bg-[var(--color-card-green)] hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 px-6 rounded-lg transition text-lg"
        >
          {authLoading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
        </button>

        <p className="text-center text-gray-400 text-sm">
          {mode === 'login' ? (
            <>
              No account?{' '}
              <button type="button" onClick={() => { setMode('register'); clearAuthError(); }} className="text-[var(--color-gold)] hover:underline">
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" onClick={() => { setMode('login'); clearAuthError(); }} className="text-[var(--color-gold)] hover:underline">
                Login
              </button>
            </>
          )}
        </p>

        <div className="text-center">
          <button
            type="button"
            onClick={() => useStore.getState().skipAuth()}
            className="text-gray-500 hover:text-gray-300 text-sm transition"
          >
            Play as guest
          </button>
        </div>
      </form>
    </div>
  );
}
