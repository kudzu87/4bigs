import {
  buildPreflopRoster,
  buildPreflopStateFromWizard,
  createPreflopStreetBase,
  parseEffectiveStackBb,
} from "./betting-round";
import type { Hand, StreetPlayer, StreetState } from "./types";

export function buildWizardPreflopRoster(
  hand: Hand,
  positions: string[],
  _bigBlind: number
): StreetPlayer[] {
  return buildPreflopRoster(
    positions,
    hand.heroPosition,
    hand.heroPositionIndex,
    hand.villains,
    hand.villainCount,
    parseEffectiveStackBb(hand.effectiveStack)
  );
}

function buildWizardPreflopBase(
  hand: Hand,
  positions: string[],
  bigBlind: number
): StreetState {
  const roster = buildWizardPreflopRoster(hand, positions, bigBlind);
  return createPreflopStreetBase({ players: roster });
}

/** Replay step-7/9 profile lines; returns final state when the preflop round is already complete. */
export function completePreflopFromWizardHistory(
  hand: Hand,
  positions: string[],
  bigBlind: number
): StreetState | null {
  const baseState = buildWizardPreflopBase(hand, positions, bigBlind);
  const { state, roundComplete } = buildPreflopStateFromWizard(hand, baseState);
  return roundComplete ? state : null;
}

/** Initial preflop street state for live step 10 when profiles do not close the round. */
export function seedWizardPreflopState(
  hand: Hand,
  positions: string[],
  bigBlind: number
): StreetState {
  const baseState = buildWizardPreflopBase(hand, positions, bigBlind);
  const { state } = buildPreflopStateFromWizard(hand, baseState);
  return state;
}
