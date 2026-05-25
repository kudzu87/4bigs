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

import { POSTFLOP_WEIGHTS } from "./constants";

export function getPostflopWeight(pos: string): number {
  return POSTFLOP_WEIGHTS[pos] ?? 99;
}
