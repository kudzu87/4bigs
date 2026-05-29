import { describe, expect, it } from "vitest";
import {
  formatStreetActionLines,
  formatStreetPotHeader,
  formatVillains,
} from "../session-summary";
import type { PotByStreet, Villain } from "../types";

const BIG_BLIND = 2;

describe("pot headers per street", () => {
  it("preflop=7.5 BB, bigBlind=2 → flop header shows pot $15", () => {
    expect(formatStreetPotHeader("flop", { preflop: 7.5 }, BIG_BLIND)).toBe(
      "Flop: (pot $15)"
    );
  });

  it("flop=12 BB, bigBlind=2 → turn header shows pot $24", () => {
    expect(formatStreetPotHeader("turn", { flop: 12 }, BIG_BLIND)).toBe(
      "Turn: (pot $24)"
    );
  });

  it("missing potByStreet → no crash, flop header uses dead-pot fallback", () => {
    expect(() => formatStreetPotHeader("flop", {}, BIG_BLIND)).not.toThrow();
    expect(formatStreetPotHeader("flop", {}, BIG_BLIND)).toBe("Flop: (pot $3)");
  });
});

describe("per-action dollar amounts", () => {
  it("Bet [1/2] with pot=10BB at flop start, bigBlind=2 → — $10", () => {
    const lines = formatStreetActionLines(
      "flop",
      ["Hero (CO) Bet [1/2]"],
      { preflop: 10 },
      BIG_BLIND
    );
    expect(lines[1]).toBe("  • Hero Bet [1/2] — $10");
  });

  it("Call with 3BB contribution, bigBlind=2 → — $6", () => {
    const lines = formatStreetActionLines(
      "preflop",
      ["Villain 1 (BTN) Bet [3]", "Hero (CO) Call"],
      {},
      BIG_BLIND
    );
    expect(lines[2]).toBe("  • Hero Call — $6");
  });

  it("Check → no dollar suffix", () => {
    const lines = formatStreetActionLines(
      "flop",
      ["Hero (CO) Check"],
      { preflop: 10 },
      BIG_BLIND
    );
    expect(lines[1]).toBe("  • Hero Check");
    expect(lines[1]).not.toContain("— $");
  });

  it("Fold → no dollar suffix", () => {
    const lines = formatStreetActionLines(
      "flop",
      ["Villain 1 (BTN) Fold"],
      { preflop: 10 },
      BIG_BLIND
    );
    expect(lines[1]).toBe("  • Villain 1 Fold");
    expect(lines[1]).not.toContain("— $");
  });
});

describe("All-In suppression", () => {
  it("action type All-In → no — $X suffix", () => {
    const lines = formatStreetActionLines(
      "preflop",
      ["Hero (CO) All-In"],
      {},
      BIG_BLIND
    );
    expect(lines[1]).toBe("  • Hero All-In");
    expect(lines[1]).not.toMatch(/— \$/);
  });

  it("sizing all-in → no — $X suffix", () => {
    const lines = formatStreetActionLines(
      "flop",
      ["Hero (CO) Bet [all-in]"],
      { preflop: 10 },
      BIG_BLIND
    );
    expect(lines[1]).toBe("  • Hero All-In");
    expect(lines[1]).not.toMatch(/— \$/);
  });
});

describe("villain block", () => {
  it("stackBb set → V1 BTN (Reg) — 50 BB — Call pre", () => {
    const villains: Villain[] = [
      { position: "BTN", tag: "Reg", action: "Call", stackBb: 50 },
    ];
    const lines = formatVillains(villains, 1);
    expect(lines[1]).toBe("  • V1 BTN (Reg) — 50 BB — Call pre");
  });

  it("stackBb undefined → no stack segment", () => {
    const villains: Villain[] = [
      { position: "BTN", tag: "Reg", action: "Call" },
    ];
    const lines = formatVillains(villains, 1);
    expect(lines[1]).toBe("  • V1 BTN (Reg) — Call pre");
    expect(lines[1]).not.toContain("50 BB");
  });
});
