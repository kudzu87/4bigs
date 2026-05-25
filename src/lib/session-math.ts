import type { Hand, Session } from "./types";

/** Parse big blind in dollars from stakes label (e.g. "1/2" → 2). */
export function parseBigBlindFromStakes(stakes: string): number {
  const trimmed = stakes.trim();
  if (trimmed === "1/2") return 2;
  if (trimmed === "1/3") return 3;
  if (trimmed === "2/5") return 5;
  const slash = trimmed.match(/^\d+\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (slash) return Number(slash[1]) || 2;
  return 2;
}

export function bbToDollarsAmount(bb: number, bigBlind: number): number {
  return Math.round(bb * bigBlind * 100) / 100;
}

export function formatBbAsDollars(bb: number, bigBlind: number): string {
  return `$${bbToDollarsAmount(bb, bigBlind)}`;
}

export function normalizeSession(session: Session): Session {
  return {
    ...session,
    bigBlind: session.bigBlind ?? parseBigBlindFromStakes(session.stakes),
  };
}

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
