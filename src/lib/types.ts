export type Card = { rank: string; suit: string };

export type Villain = {
  position?: string;
  tag?: string;
  action?: string;
  note?: string;
  stackBb?: number;
  flopFolded?: boolean;
  turnFolded?: boolean;
  riverFolded?: boolean;
};

export type Hand = {
  id: string;
  effectiveStack: string;
  heroPosition: string;
  heroPositionIndex: number | null;
  heroCards: Card[];
  preflopAction: string;
  preflopAmount: string;
  preflopActions: string[];
  villainCount: number;
  villains: Villain[];
  boardFlop: Card[];
  flopActions: string[];
  preflopFolded?: boolean;
  boardTurn: Card;
  turnActions: string[];
  boardRiver: Card;
  riverActions: string[];
  result: string;
  resultAmount: string;
  notes: string;
  tags: string[];
  reviewWanted?: boolean;
  flopFolded?: boolean;
  turnFolded?: boolean;
  riverFolded?: boolean;
  /** Pot in BB at end of each street (from live betting engine). */
  potByStreet?: PotByStreet;
};

export type SessionDraft = {
  hand: Hand;
  wizardStep: number;
  selectedVillainIndex: number;
};

export type Session = {
  id: string;
  startTime: string;
  endTime?: string;
  stakes: string;
  /** Big blind size in dollars (derived from stakes, e.g. 1/2 → 2). */
  bigBlind: number;
  tableSize: number;
  roomName: string;
  startingStack: string;
  hands: Hand[];
  netAmount: number;
  draft?: SessionDraft | null;
};

export type AppStep =
  | "HOME"
  | "START_SESSION"
  | "ACTIVE_SESSION"
  | "HAND_WIZARD"
  | "INSTALL_GUIDE";

export type StreetPlayer = {
  id: string;
  label: string;
  position: string;
  isHero: boolean;
  folded: boolean;
  contribution: number;
  /** Stack behind in BB at street start; decremented as chips go in. */
  remainingStack: number;
  lastAction: string;
  actedThisRound: boolean;
};

export type PotByStreet = {
  preflop?: number;
  flop?: number;
  turn?: number;
  river?: number;
};

export type StreetState = {
  street: "preflop" | "flop" | "turn" | "river";
  players: StreetPlayer[];
  history: string[];
  currentActorIndex: number;
  /** Current pot size in BB (includes blind seed on preflop). */
  pot: number;
  /** Pot in BB at end of each completed street. */
  potByStreet: PotByStreet;
  highestBet: number;
  lastRaiserId: string | null;
  showBetSizes: boolean;
  currentActionPending: string;
  currentActionPendingCustom?: boolean;
  /** Step 7 line to highlight when hero acts after villains (e.g. Call). */
  rememberedHeroAction?: string;
  rememberedHeroSizing?: string;
};

export type SessionSetup = {
  stakes: string;
  tableSize: number;
  startingStack: string;
  roomName: string;
};
