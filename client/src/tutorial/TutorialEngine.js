// TutorialEngine — pure JS state machine for the tutorial flow
import { TUTORIAL_STEPS } from "./tutorialSteps.js";

export class TutorialEngine {
  constructor() {
    this.steps = TUTORIAL_STEPS;
    this.currentStepIndex = 0;
    this.gameState = this.steps[0].setupState();
  }

  getState() {
    return this.gameState;
  }

  getStepConfig() {
    const step = this.steps[this.currentStepIndex];
    const hiddenIds = ["select-target", "complete"];
    const visibleSteps = this.steps.filter((s) => !hiddenIds.includes(s.id));
    const displayTotalSteps = visibleSteps.length;
    const displayStepNumber = this.steps
      .slice(0, this.currentStepIndex + 1)
      .filter((s) => !hiddenIds.includes(s.id)).length;
    return {
      stepNumber: this.currentStepIndex + 1,
      totalSteps: this.steps.length,
      displayStepNumber,
      displayTotalSteps,
      id: step.id,
      title: step.title,
      instruction: step.instruction,
      highlight: step.highlight,
      highlightCardUid: step.highlightCardUid || null,
      tabHint: step.tabHint,
      opponentDelay: step.opponentDelay || false,
      gnarlMessage: step.gnarlMessage || null,
    };
  }

  getCurrentStep() {
    return this.currentStepIndex;
  }

  isFinished() {
    return (
      this.currentStepIndex >= this.steps.length - 1 &&
      this.steps[this.currentStepIndex].id === "complete"
    );
  }

  handleAction(actionType, payload = {}) {
    const step = this.steps[this.currentStepIndex];

    // Final step has no expected action
    if (!step.expectedAction) {
      return { advanced: false, finished: true };
    }

    // Check if action type matches
    if (actionType !== step.expectedAction) {
      return { advanced: false, finished: false };
    }

    // Check payload matcher if specified
    if (step.expectedPayload) {
      for (const [key, value] of Object.entries(step.expectedPayload)) {
        if (payload[key] !== value) {
          return { advanced: false, finished: false };
        }
      }
    }

    // Action matches — advance
    if (step.onComplete) {
      this.gameState = step.onComplete(this.gameState, payload);
    }

    this.currentStepIndex++;

    // If next step has its own setupState, use that instead
    const nextStep = this.steps[this.currentStepIndex];
    if (nextStep?.setupState) {
      this.gameState = nextStep.setupState();
    }

    const finished =
      this.currentStepIndex >= this.steps.length - 1 &&
      this.steps[this.currentStepIndex].id === "complete";

    return { advanced: true, finished };
  }
}
