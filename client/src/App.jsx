import { useEffect, Component } from "react";
import { useStore } from "./store.js";
import LoginScreen from "./screens/LoginScreen.jsx";
import LobbyScreen from "./screens/LobbyScreen.jsx";
import RoomScreen from "./screens/RoomScreen.jsx";
import GameScreen from "./screens/GameScreen.jsx";
import TutorialScreen from "./screens/TutorialScreen.jsx";
import StoryScreen from "./screens/StoryScreen.jsx";

// Error boundary to catch React render crashes and show the error instead of blank screen
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 20,
            color: "#ff6b6b",
            background: "#1a1a2e",
            minHeight: "100vh",
            fontFamily: "monospace",
          }}
        >
          <h2 style={{ color: "#ffd93d" }}>Something went wrong</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, marginTop: 10 }}>
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontSize: 11,
              color: "#888",
              marginTop: 10,
            }}
          >
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
            style={{
              marginTop: 20,
              padding: "10px 20px",
              background: "#ffd93d",
              color: "#000",
              border: "none",
              borderRadius: 8,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const {
    screen,
    connected,
    error,
    clearError,
    connect,
    authToken,
    loadProfile,
  } = useStore();

  // Auto-login with saved token on mount
  useEffect(() => {
    if (authToken && authToken !== "guest") {
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
      {error &&
        (() => {
          const isInfo = /\b(reconnected|disconnected)\b/i.test(error);
          return (
            <div
              className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
                isInfo
                  ? "bg-blue-900/90 border border-blue-500 text-blue-100"
                  : "bg-amber-900/90 border border-amber-500 text-amber-100"
              }`}
            >
              <span
                className={`text-lg ${isInfo ? "text-blue-300" : "text-amber-300"}`}
              >
                {isInfo ? "\u2139" : "!"}
              </span>
              <span>{error}</span>
              <button
                onClick={clearError}
                className={`font-bold ${isInfo ? "text-blue-400 hover:text-white" : "text-amber-400 hover:text-white"}`}
              >
                X
              </button>
            </div>
          );
        })()}

      {!connected && screen !== "tutorial" && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center">
          <div className="text-white text-xl font-display">
            Connecting to server...
          </div>
        </div>
      )}

      {screen === "lobby" && <LobbyScreen />}
      {screen === "room" && <RoomScreen />}
      {screen === "game" && <GameScreen />}
      {screen === "tutorial" && <TutorialScreen />}
      {screen === "story" && <StoryScreen />}
      {!["lobby", "room", "game", "tutorial", "story"].includes(screen) && (
        <LobbyScreen />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
