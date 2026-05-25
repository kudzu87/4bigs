import { STORAGE_KEY } from "./constants";
import type { Session } from "./types";

export function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as Session[];
  } catch {
    console.error("Corrupted local save schema resolved.");
    return [];
  }
}

export function saveSessions(sessions: Session[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function createEmptyHand(): import("./types").Hand {
  return {
    id: Date.now().toString(),
    effectiveStack: "",
    heroPosition: "",
    heroPositionIndex: null,
    heroCards: [
      { rank: "", suit: "" },
      { rank: "", suit: "" },
    ],
    preflopAction: "",
    preflopAmount: "",
    villainCount: 1,
    villains: [],
    boardFlop: [
      { rank: "", suit: "" },
      { rank: "", suit: "" },
      { rank: "", suit: "" },
    ],
    flopActions: [],
    boardTurn: { rank: "", suit: "" },
    turnActions: [],
    boardRiver: { rank: "", suit: "" },
    riverActions: [],
    result: "",
    resultAmount: "",
    notes: "",
    tags: [],
  };
}
