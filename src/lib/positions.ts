import { POSTFLOP_WEIGHTS } from "./constants";
import type { Villain } from "./types";

export function getPositionsForSize(size: number): string[] {
  switch (Number(size)) {
    case 6:
      return ["UTG", "MP", "CO", "BTN", "SB", "BB"];
    case 8:
      return ["UTG", "UTG+1", "MP", "HJ", "CO", "BTN", "SB", "BB"];
    case 9:
      return ["UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"];
    case 10:
      return ["UTG", "UTG+1", "UTG+2", "MP1", "MP2", "HJ", "CO", "BTN", "SB", "BB"];
    default:
      return ["UTG", "MP", "CO", "BTN", "SB", "BB"];
  }
}

export function getPostflopWeight(pos: string): number {
  return POSTFLOP_WEIGHTS[pos] ?? 99;
}

/** How villain seat options are constrained from hero preflop action. */
export type VillainPositionMode = "all" | "later-only" | "earlier-only";

export function getVillainPositionMode(
  heroPreflopAction: string,
  villainCount: number
): VillainPositionMode {
  if (
    heroPreflopAction === "Limp" ||
    heroPreflopAction === "Raise" ||
    heroPreflopAction === "3-Bet"
  ) {
    return "later-only";
  }
  if (heroPreflopAction === "Call" && villainCount === 1) {
    return "earlier-only";
  }
  return "all";
}

/** Default villain preflop label when hero line implies villain acted first (or responded). */
export function inferDefaultVillainPreflopAction(
  heroPreflopAction: string
): string | undefined {
  if (heroPreflopAction === "Call") return "Raise";
  if (heroPreflopAction === "Limp") return undefined;
  if (heroPreflopAction === "Raise") return "Call";
  if (heroPreflopAction === "3-Bet") return "Call";
  return undefined;
}

export function heroPreflopActsBeforeVillains(
  heroPreflopAction: string
): boolean {
  return (
    heroPreflopAction === "Limp" ||
    heroPreflopAction === "Raise" ||
    heroPreflopAction === "3-Bet"
  );
}

export function getVillainPositionHint(mode: VillainPositionMode): string | null {
  switch (mode) {
    case "later-only":
      return "Based on your limp, raise, or 3-bet, villains are in later positions (acted after you).";
    case "earlier-only":
      return "Based on your call, the raiser is in an earlier position.";
    default:
      return null;
  }
}

export function getFilteredVillainPositions(
  positions: string[],
  heroPositionIndex: number | null,
  mode: VillainPositionMode
): string[] {
  if (heroPositionIndex == null || mode === "all") {
    return positions;
  }
  if (mode === "later-only") {
    return positions.filter((_, idx) => idx > heroPositionIndex);
  }
  if (mode === "earlier-only") {
    return positions.filter((_, idx) => idx < heroPositionIndex);
  }
  return positions;
}

/** Suggested seat for villain N given hero action and table layout. */
export function getSuggestedVillainPosition(
  positions: string[],
  heroPositionIndex: number | null,
  mode: VillainPositionMode,
  villainIndex: number
): string {
  const filtered = getFilteredVillainPositions(positions, heroPositionIndex, mode);

  if (filtered.length > 0) {
    if (mode === "earlier-only") {
      return filtered[filtered.length - 1];
    }
    if (mode === "later-only") {
      return filtered[Math.min(villainIndex, filtered.length - 1)];
    }
  }

  if (heroPositionIndex != null) {
    const fallbackIdx = (heroPositionIndex + 1 + villainIndex) % positions.length;
    return positions[fallbackIdx];
  }

  return positions[villainIndex % positions.length] ?? positions[0];
}

export function buildInitialVillains(
  positions: string[],
  heroPositionIndex: number | null,
  heroPreflopAction: string,
  villainCount: number
): Villain[] {
  const mode = getVillainPositionMode(heroPreflopAction, villainCount);
  const defaultAction = inferDefaultVillainPreflopAction(heroPreflopAction);
  return Array.from({ length: villainCount }, (_, i) => ({
    position: getSuggestedVillainPosition(positions, heroPositionIndex, mode, i),
    ...(defaultAction ? { action: defaultAction } : {}),
  }));
}

export function sanitizeVillainPositions(
  villains: Villain[],
  positions: string[],
  heroPositionIndex: number | null,
  heroPreflopAction: string,
  villainCount: number
): Villain[] {
  const mode = getVillainPositionMode(heroPreflopAction, villainCount);
  const allowed = new Set(
    getFilteredVillainPositions(positions, heroPositionIndex, mode)
  );

  return Array.from({ length: villainCount }, (_, i) => {
    const existing = villains[i] ?? {};
    const position =
      existing.position && (mode === "all" || allowed.has(existing.position))
        ? existing.position
        : getSuggestedVillainPosition(positions, heroPositionIndex, mode, i);
    return { ...existing, position };
  });
}
