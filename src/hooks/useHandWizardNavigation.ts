"use client";

import { useCallback } from "react";
import { playHaptic } from "@/lib/haptics";
import {
  getStepTitle,
  isStepComplete,
  shouldShowContinueButton,
} from "@/lib/wizard-navigation";
import { completePreflopFromWizardHistory } from "@/lib/wizard-preflop";
import type { Hand, StreetState } from "@/lib/types";

export { getStepTitle, isStepComplete, shouldShowContinueButton };

export type HandWizardNavigationDeps = {
  initStreetState?: (street: "flop" | "turn" | "river") => void;
  positions?: string[];
};

function isPreflopLiveStepSkipped(
  hand: Hand,
  positions: string[],
  bigBlind: number
): boolean {
  return completePreflopFromWizardHistory(hand, positions, bigBlind) !== null;
}

export function useHandWizardNavigation(
  wizardStep: number,
  setWizardStep: React.Dispatch<React.SetStateAction<number>>,
  hand: Hand,
  streetState: StreetState,
  bigBlind: number,
  onStepChange?: (nextStep: number, fromStep: number) => void,
  deps?: HandWizardNavigationDeps
): {
  goNext: () => void;
  goBack: () => void;
} {
  const { initStreetState, positions = [] } = deps ?? {};

  const goNext = useCallback(() => {
    if (!isStepComplete(wizardStep, hand)) return;
    playHaptic("click");

    const fromStep = wizardStep;
    const nextStep = wizardStep + 1;

    onStepChange?.(nextStep, fromStep);

    if (fromStep === 13 && streetState.street !== "flop") {
      initStreetState?.("flop");
    } else if (fromStep === 15 && streetState.street !== "turn") {
      initStreetState?.("turn");
    } else if (fromStep === 17 && streetState.street !== "river") {
      initStreetState?.("river");
    }

    setWizardStep(nextStep);
  }, [
    wizardStep,
    hand,
    streetState.street,
    initStreetState,
    onStepChange,
    setWizardStep,
  ]);

  const goBack = useCallback(() => {
    playHaptic("click");
    setWizardStep((prev) => {
      if (
        prev === 11 &&
        positions.length > 0 &&
        isPreflopLiveStepSkipped(hand, positions, bigBlind)
      ) {
        return 9;
      }
      return prev - 1;
    });
  }, [hand, positions, bigBlind, setWizardStep]);

  return { goNext, goBack };
}
