import { describe, expect, it } from "vitest";
import {
  getVillainPositionMode,
  heroPreflopActsBeforeVillains,
  inferDefaultVillainPreflopAction,
} from "../positions";

describe("getVillainPositionMode", () => {
  it("returns later-only for Limp", () => {
    expect(getVillainPositionMode("Limp", 1)).toBe("later-only");
  });

  it("returns later-only for Raise", () => {
    expect(getVillainPositionMode("Raise", 1)).toBe("later-only");
  });

  it("returns later-only for 3-Bet", () => {
    expect(getVillainPositionMode("3-Bet", 1)).toBe("later-only");
  });

  it("returns earlier-only for Call with 1 villain", () => {
    expect(getVillainPositionMode("Call", 1)).toBe("earlier-only");
  });

  it("returns later-only for 3-Bet with 1 villain (not earlier-only)", () => {
    expect(getVillainPositionMode("3-Bet", 1)).toBe("later-only");
    expect(getVillainPositionMode("3-Bet", 1)).not.toBe("earlier-only");
  });

  it("returns all for Call with 2 villains", () => {
    expect(getVillainPositionMode("Call", 2)).toBe("all");
  });

  it("returns all for Fold", () => {
    expect(getVillainPositionMode("Fold", 1)).toBe("all");
  });

  it("returns all for All-In", () => {
    expect(getVillainPositionMode("All-In", 1)).toBe("all");
  });
});

describe("heroPreflopActsBeforeVillains", () => {
  it("returns true for Limp", () => {
    expect(heroPreflopActsBeforeVillains("Limp")).toBe(true);
  });

  it("returns true for Raise", () => {
    expect(heroPreflopActsBeforeVillains("Raise")).toBe(true);
  });

  it("returns true for 3-Bet", () => {
    expect(heroPreflopActsBeforeVillains("3-Bet")).toBe(true);
  });

  it("returns false for Call", () => {
    expect(heroPreflopActsBeforeVillains("Call")).toBe(false);
  });

  it("returns false for All-In", () => {
    expect(heroPreflopActsBeforeVillains("All-In")).toBe(false);
  });
});

describe("inferDefaultVillainPreflopAction", () => {
  it("returns Raise for Call", () => {
    expect(inferDefaultVillainPreflopAction("Call")).toBe("Raise");
  });

  it("returns Call for Raise", () => {
    expect(inferDefaultVillainPreflopAction("Raise")).toBe("Call");
  });

  it("returns Call for 3-Bet (not Raise)", () => {
    expect(inferDefaultVillainPreflopAction("3-Bet")).toBe("Call");
    expect(inferDefaultVillainPreflopAction("3-Bet")).not.toBe("Raise");
  });

  it("returns undefined for Limp", () => {
    expect(inferDefaultVillainPreflopAction("Limp")).toBeUndefined();
  });

  it("returns undefined for All-In", () => {
    expect(inferDefaultVillainPreflopAction("All-In")).toBeUndefined();
  });
});
