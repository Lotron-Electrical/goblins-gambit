import { useEffect } from "react";
import { useStore } from "../store.js";
import GameScreen from "./GameScreen.jsx";
import TutorialOverlay from "../tutorial/TutorialOverlay.jsx";

export default function TutorialScreen() {
  const { startTutorial } = useStore();

  useEffect(() => {
    startTutorial();
    return () => {
      // Cleanup handled by endTutorial/leaveRoom
    };
  }, []);

  return (
    <>
      <GameScreen />
      <TutorialOverlay />
    </>
  );
}
