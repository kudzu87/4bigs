import type { Hand } from "./types";

const AUTO_ADVANCE_STEPS = [3, 4, 5, 6, 7, 8, 10, 11, 12, 14, 16, 18] as const;

/** Steps that use the footer Continue / Save button (not tap-to-advance grids). */
export function shouldShowContinueButton(wizardStep: number, _hand: Hand): boolean {
  return !(AUTO_ADVANCE_STEPS as readonly number[]).includes(wizardStep);
}

export function getStepTitle(
  wizardStep: number,
  hand: Hand,
  selectedVillainIndex: number
): string {
  switch (wizardStep) {
    case 3:
      return "Step 3: Effective Stack";
    case 4:
      return "Step 4: Your Position";
    case 5:
      return "Step 5: Hero Card 1";
    case 6:
      return "Step 6: Hero Card 2";
    case 7:
      return "Step 7: Hero Preflop Action";
    case 8:
      return "Step 8: Villain Count";
    case 9:
      return `Step 9: Villain Profile (${selectedVillainIndex + 1}/${hand.villainCount})`;
    case 10:
      return "Step 10: Preflop Live Action";
    case 11:
      return "Step 11: Flop Card 1";
    case 12:
      return "Step 12: Flop Card 2";
    case 13:
      return "Step 13: Flop Card 3";
    case 14:
      return "Step 14: Flop Live Action";
    case 15:
      return "Step 15: Turn Board Card";
    case 16:
      return "Step 16: Turn Live Action";
    case 17:
      return "Step 17: River Board Card";
    case 18:
      return "Step 18: River Live Action";
    case 19:
      return "Step 19: Hand Outcome";
    case 20:
      return "Step 20: Notes & Analysis";
    default:
      return "Configure Hand";
  }
}

/** Whether the current step is ready to advance via Continue / goNext. */
export function isStepComplete(_wizardStep: number, _hand: Hand): boolean {
  // No per-step validation in HandWizard yet; Continue is never blocked.
  return true;
}
