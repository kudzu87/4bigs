import { ACTIVE_SESSION_KEY, STORAGE_KEY } from "./constants";
import { recalculateSessionNet } from "./session-math";
import type { Hand, Session, SessionDraft } from "./types";

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

export function loadActiveSession(): Session | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(ACTIVE_SESSION_KEY);
  if (!stored) return null;
  try {
    const session = JSON.parse(stored) as Session;
    if (!session?.id || session.endTime) return null;
    return {
      ...session,
      netAmount: recalculateSessionNet(session.hands ?? []),
    };
  } catch {
    console.error("Corrupted active session save cleared.");
    clearActiveSession();
    return null;
  }
}

export function saveActiveSession(session: Session | null): void {
  if (typeof window === "undefined") return;
  if (!session) {
    clearActiveSession();
    return;
  }
  const { draft, ...rest } = session;
  const payload: Session = {
    ...rest,
    netAmount: recalculateSessionNet(rest.hands ?? []),
    ...(draft ? { draft } : {}),
  };
  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(payload));
}

export function clearActiveSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACTIVE_SESSION_KEY);
}

export function createEmptyHand(): Hand {
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
    preflopActions: [],
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

export function cloneHand(hand: Hand): Hand {
  return JSON.parse(JSON.stringify(hand)) as Hand;
}

export function buildSessionWithDraft(
  session: Session,
  draft: SessionDraft | null
): Session {
  const next = { ...session, netAmount: recalculateSessionNet(session.hands) };
  if (draft) {
    next.draft = draft;
  } else {
    delete next.draft;
  }
  return next;
}
