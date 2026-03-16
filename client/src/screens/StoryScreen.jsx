/**
 * StoryScreen — top-level story mode router.
 * Renders the appropriate sub-screen based on storyStore state.
 */

import { useStoryStore } from "../storyStore.js";
import { useStore } from "../store.js";
import StoryMenuScreen from "../components/story/StoryMenuScreen.jsx";
import CardCreationScreen from "../components/story/CardCreationScreen.jsx";
import StoryMapScreen from "../components/story/StoryMapScreen.jsx";
import EnhancementScreen from "../components/story/EnhancementScreen.jsx";
import StoryBattleHUD from "../components/story/StoryBattleHUD.jsx";
import RunOverScreen from "../components/story/RunOverScreen.jsx";
import TrophyCabinetScreen from "../components/story/TrophyCabinetScreen.jsx";
import GameScreen from "./GameScreen.jsx";

export default function StoryScreen() {
  const { storyScreen } = useStoryStore();

  switch (storyScreen) {
    case "menu":
      return <StoryMenuScreen />;
    case "creation":
      return <CardCreationScreen />;
    case "map":
      return <StoryMapScreen />;
    case "enhancement":
      return <EnhancementScreen />;
    case "battle":
      return (
        <div className="relative">
          <GameScreen isStoryMode />
          <StoryBattleHUD />
        </div>
      );
    case "run_over":
      return <RunOverScreen />;
    case "trophies":
      return <TrophyCabinetScreen />;
    default:
      return <StoryMenuScreen />;
  }
}
