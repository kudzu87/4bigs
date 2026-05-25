export const STAKES = ["1/2", "1/3", "2/5", "Other"] as const;
export const TABLE_SIZES = [6, 8, 9, 10] as const;
export const RANKS = [
  "A",
  "K",
  "Q",
  "J",
  "10",
  "9",
  "8",
  "7",
  "6",
  "5",
  "4",
  "3",
  "2",
] as const;
export const SUITS = [
  {
    symbol: "♠",
    name: "Spades",
    color: "text-sky-400",
    bg: "bg-sky-950/40 border-sky-800",
  },
  {
    symbol: "♥",
    name: "Hearts",
    color: "text-rose-500",
    bg: "bg-rose-950/40 border-rose-800",
  },
  {
    symbol: "♦",
    name: "Diamonds",
    color: "text-pink-500",
    bg: "bg-pink-950/40 border-pink-800",
  },
  {
    symbol: "♣",
    name: "Clubs",
    color: "text-emerald-400",
    bg: "bg-emerald-950/40 border-emerald-800",
  },
] as const;
export const ACTIONS = ["Fold", "Limp", "Call", "Raise", "3-Bet", "All-In"] as const;

/** Preflop open/raise sizing stored as BB multiplier string (e.g. "2", "2.5") or "all-in". */
export type PreflopBbSizingValue = number | "all-in";

export const PREFLOP_BB_SIZINGS = [
  { label: "2BB", bb: 2 },
  { label: "2.5BB", bb: 2.5 },
  { label: "3BB", bb: 3 },
  { label: "4BB", bb: 4 },
  { label: "5BB", bb: 5 },
  { label: "All-In", bb: "all-in" as const },
] as const;

export const PREFLOP_SIZING_CUSTOM = "custom" as const;

export function preflopBbToAmount(bb: PreflopBbSizingValue): string {
  return bb === "all-in" ? "all-in" : String(bb);
}

export function formatPreflopSizing(amount: string): string {
  if (!amount) return "";
  if (amount === "all-in") return "All-In";
  const trimmed = amount.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return `${trimmed}BB`;
  }
  return amount;
}

export function isPresetPreflopBbAmount(amount: string): boolean {
  if (amount === "all-in") return true;
  return PREFLOP_BB_SIZINGS.some(
    (o) => typeof o.bb === "number" && String(o.bb) === amount
  );
}

/** Step 10 preflop live logger: BB presets + Custom. */
export const PREFLOP_LIVE_SIZING_OPTIONS = [
  ...PREFLOP_BB_SIZINGS.map((o) => ({
    label: o.label,
    value: preflopBbToAmount(o.bb),
  })),
  { label: "Custom", value: PREFLOP_SIZING_CUSTOM },
] as const;

/** Postflop bet/raise sizing (fractional pot labels). */
export const POSTFLOP_SIZINGS = [
  "1/3",
  "1/2",
  "2/3",
  "pot",
  "all-in",
  "custom",
] as const;

export function formatPostflopSizingLabel(value: string): string {
  if (value === "pot") return "Pot";
  if (value === "all-in") return "All-In";
  if (value === "custom") return "Custom";
  return value;
}
export const PROFILE_TAGS = [
  "Fish",
  "Reg",
  "Nit",
  "LAG",
  "Calling Station",
  "Unknown",
] as const;
export const REVIEW_TAG_GROUPS = {
  "Spot type": [
    "3-Bet Pot",
    "Multiway",
    "Single Raised Pot",
    "Missed Draw",
  ],
  "My decision": [
    "Bluff",
    "Thin Value",
    "Hero Call",
    "Big Fold",
    "Overbet",
    "Probe Bet",
  ],
  "Session state": ["Tilted", "Bad Beat", "Running Good"],
} as const;

/** Flat list for `hand.tags`, export, and any code that iterates all review tags. */
export const REVIEW_TAGS = [
  ...REVIEW_TAG_GROUPS["Spot type"],
  ...REVIEW_TAG_GROUPS["My decision"],
  ...REVIEW_TAG_GROUPS["Session state"],
] as const;

export const POSTFLOP_WEIGHTS: Record<string, number> = {
  SB: 1,
  BB: 2,
  UTG: 3,
  "UTG+1": 4,
  "UTG+2": 5,
  MP1: 6,
  MP2: 7,
  MP: 8,
  LJ: 9,
  HJ: 10,
  CO: 11,
  BTN: 12,
};

export const STORAGE_KEY = "four_bigs_sessions";
export const ACTIVE_SESSION_KEY = "four_bigs_active_session";
