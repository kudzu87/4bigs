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
export const PROFILE_TAGS = [
  "Fish",
  "Reg",
  "Nit",
  "LAG",
  "Calling Station",
  "Unknown",
] as const;
export const REVIEW_TAGS = [
  "Bluff",
  "Bad Beat",
  "Value Bet",
  "Big Fold",
  "Tilted",
  "Premium Hand",
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
