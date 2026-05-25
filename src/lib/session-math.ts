import type { Hand } from "./types";

export function getHandNetChange(hand: Hand): number {
  const netChange = Number(hand.resultAmount) || 0;
  let multiplier = 1;
  if (hand.result === "Lost") multiplier = -1;
  else if (hand.result === "Split") multiplier = 0.5;
  return netChange * multiplier;
}

export function recalculateSessionNet(hands: Hand[]): number {
  return hands.reduce((sum, hand) => sum + getHandNetChange(hand), 0);
}
