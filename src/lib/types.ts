export type Card = { rank: string; suit: string };

export type Villain = {
  position?: string;
  tag?: string;
  action?: string;
  note?: string;
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
  flopFolded?: boolean;
  turnFolded?: boolean;
  riverFolded?: boolean;
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
  lastAction: string;
  actedThisRound: boolean;
};

export type StreetState = {
  street: "preflop" | "flop" | "turn" | "river";
  players: StreetPlayer[];
  history: string[];
  currentActorIndex: number;
  highestBet: number;
  lastRaiserId: string | null;
  showBetSizes: boolean;
  currentActionPending: string;
  currentActionPendingCustom?: boolean;
};

export type SessionSetup = {
  stakes: string;
  tableSize: number;
  startingStack: string;
  roomName: string;
};
