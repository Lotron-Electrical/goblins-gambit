import { useState } from "react";
import { useStore } from "../store.js";
import SparkleParticles from "../components/ui/SparkleParticles.jsx";

export default function LoginScreen() {
  const { loginUser, registerUser, authLoading, authError, clearAuthError } =
    useStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("register"); // 'login' | 'register' — default to register for new players

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    if (mode === "login") {
      loginUser(username.trim(), password);
    } else {
      registerUser(username.trim(), password);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      <SparkleParticles />

      {/* Title section */}
      <div className="text-center mb-10 relative z-10">
        <h1 className="text-4xl md:text-7xl font-display text-[var(--color-gold-bright)] drop-shadow-[0_0_40px_rgba(212,160,23,0.6)] mb-3 tracking-wide animate-[pulse_4s_ease-in-out_infinite]">
          Goblin's Gambit
        </h1>
        <div className="w-24 h-0.5 mx-auto bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent mb-3" />
        <p className="text-gray-400 text-lg tracking-widest uppercase text-[13px]">
          A card game of cunning and chaos
        </p>
      </div>

      {/* Form card */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 relative z-10 bg-gray-950/60 border border-gray-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-[0_0_60px_rgba(0,0,0,0.5)]"
      >
        <div>
          <label className="block text-[var(--color-gold)]/70 text-xs font-bold uppercase tracking-wider mb-2">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              clearAuthError();
            }}
            placeholder="Enter username..."
            maxLength={20}
            autoComplete="username"
            className="w-full bg-gray-900/80 border border-gray-700/60 rounded-lg px-4 py-3 text-white text-lg placeholder-gray-600 focus:outline-none focus:border-[var(--color-gold)] focus:shadow-[0_0_12px_rgba(212,160,23,0.15)] transition-all duration-300"
          />
        </div>

        <div>
          <label className="block text-[var(--color-gold)]/70 text-xs font-bold uppercase tracking-wider mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearAuthError();
            }}
            placeholder="Enter password..."
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            className="w-full bg-gray-900/80 border border-gray-700/60 rounded-lg px-4 py-3 text-white text-lg placeholder-gray-600 focus:outline-none focus:border-[var(--color-gold)] focus:shadow-[0_0_12px_rgba(212,160,23,0.15)] transition-all duration-300"
          />
        </div>

        {authError && (
          <div className="text-center bg-red-950/40 border border-red-800/40 rounded-lg py-2.5 px-3">
            <p className="text-red-400 text-sm">{authError}</p>
            {mode === "login" && authError.includes("Invalid") && (
              <p className="text-gray-400 text-xs mt-1">
                New here?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    clearAuthError();
                  }}
                  className="text-[var(--color-gold)] hover:text-[var(--color-gold-bright)] hover:underline transition-colors"
                >
                  Create an account
                </button>
              </p>
            )}
            {mode === "register" && authError.includes("taken") && (
              <p className="text-gray-400 text-xs mt-1">
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    clearAuthError();
                  }}
                  className="text-[var(--color-gold)] hover:text-[var(--color-gold-bright)] hover:underline transition-colors"
                >
                  Login instead
                </button>
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={authLoading || !username.trim() || !password.trim()}
          className="w-full bg-gradient-to-b from-[var(--color-card-green)] to-green-800 hover:from-green-600 hover:to-green-700 disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500 text-white font-display font-bold py-3.5 px-6 rounded-lg transition-all duration-300 text-lg shadow-[0_4px_16px_rgba(21,128,61,0.3)] hover:shadow-[0_4px_24px_rgba(21,128,61,0.5)] disabled:shadow-none hover:scale-[1.02] active:scale-[0.98] border border-green-600/30 disabled:border-gray-600/30"
        >
          {authLoading
            ? "Please wait..."
            : mode === "login"
              ? "Login"
              : "Register"}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-800" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-gray-950/60 px-3 text-gray-500">or</span>
          </div>
        </div>

        <p className="text-center text-gray-400 text-sm">
          {mode === "login" ? (
            <>
              No account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  clearAuthError();
                }}
                className="text-[var(--color-gold)] hover:text-[var(--color-gold-bright)] transition-colors duration-200"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  clearAuthError();
                }}
                className="text-[var(--color-gold)] hover:text-[var(--color-gold-bright)] transition-colors duration-200"
              >
                Login
              </button>
            </>
          )}
        </p>

        <div className="text-center">
          <button
            type="button"
            onClick={() => useStore.getState().skipAuth()}
            className="text-gray-600 hover:text-gray-300 text-xs transition-colors duration-200 tracking-wide uppercase"
          >
            Play as guest
          </button>
        </div>
      </form>
    </div>
  );
}
