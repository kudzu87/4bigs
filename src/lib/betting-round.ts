import type {
  Hand,
  PotByStreet,
  StreetPlayer,
  StreetState,
} from "./types";

export type PreflopActionType = "Fold" | "Limp" | "Call" | "Check" | "Bet" | "Raise";
export type PostflopActionType = "Fold" | "Call" | "Check" | "Bet" | "Raise";

/** SB (0.5) + BB (1.0) posted before preflop action. */
export const PREFLOP_DEAD_POT_BB = 1.5;

const DEFAULT_OPEN_BB = 2;
const DEFAULT_MIN_RAISE_BB = 2;

export function createPreflopStreetBase(
  overrides: Partial<StreetState> = {}
): StreetState {
  return {
    street: "preflop",
    players: [],
    history: [],
    currentActorIndex: 0,
    pot: PREFLOP_DEAD_POT_BB,
    potByStreet: {},
    highestBet: 0,
    lastRaiserId: null,
    showBetSizes: false,
    currentActionPending: "",
    ...overrides,
  };
}

export function snapshotPotForStreet(
  potByStreet: PotByStreet,
  street: StreetState["street"],
  pot: number
): PotByStreet {
  return { ...potByStreet, [street]: pot };
}

function parseBbMultiplier(sizing: string): number | null {
  if (!sizing || sizing === "all-in") return null;
  const trimmed = sizing.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  const match = trimmed.match(/([\d.]+)\s*bb/i);
  if (match) return Number(match[1]);
  return null;
}

/** Postflop bet/raise size in BB from fractional label and pot at action start. */
export function resolvePostflopWagerBb(
  potAtActionStart: number,
  sizing: string
): number | null {
  const key = sizing.trim().toLowerCase();
  if (key === "1/3") return potAtActionStart / 3;
  if (key === "1/2") return potAtActionStart / 2;
  if (key === "2/3") return (potAtActionStart * 2) / 3;
  if (key === "pot") return potAtActionStart;
  return parseBbMultiplier(sizing);
}

function resolvePreflopContributionBb(
  actionType: string,
  sizing: string,
  highestBetBb: number
): number | null {
  const bb = parseBbMultiplier(sizing);
  if (actionType === "Limp") return 1;
  if (actionType === "Call") return highestBetBb;
  if (actionType === "Bet") {
    return bb ?? (highestBetBb === 0 ? DEFAULT_OPEN_BB : highestBetBb + DEFAULT_MIN_RAISE_BB);
  }
  if (actionType === "Raise") {
    if (bb != null) return Math.max(bb, highestBetBb + DEFAULT_MIN_RAISE_BB);
    return highestBetBb + DEFAULT_MIN_RAISE_BB;
  }
  return null;
}

function resolvePostflopContributionBb(
  actionType: string,
  sizing: string,
  potAtActionStart: number,
  highestBetBb: number,
  currentContributionBb: number
): number | null {
  if (actionType === "Call") return highestBetBb;
  const wager = resolvePostflopWagerBb(potAtActionStart, sizing);
  if (actionType === "Bet") {
    return wager ?? (highestBetBb === 0 ? potAtActionStart / 2 : highestBetBb + 1);
  }
  if (actionType === "Raise") {
    const increment = wager ?? 1;
    return highestBetBb + increment;
  }
  return null;
}

function resolveContributionBb(
  state: StreetState,
  actionType: string,
  sizing: string,
  player: StreetPlayer
): number | null {
  if (!["Limp", "Call", "Bet", "Raise"].includes(actionType)) return null;

  if (state.street === "preflop") {
    return resolvePreflopContributionBb(actionType, sizing, state.highestBet);
  }

  return resolvePostflopContributionBb(
    actionType,
    sizing,
    state.pot,
    state.highestBet,
    player.contribution
  );
}

function maxContributionBb(players: StreetPlayer[]): number {
  return players.reduce((max, p) => (p.folded ? max : Math.max(max, p.contribution)), 0);
}

/** Pot in BB at the start of betting on each street. */
export function getStreetStartPotBb(
  street: StreetState["street"],
  potByStreet: PotByStreet = {}
): number {
  switch (street) {
    case "preflop":
      return PREFLOP_DEAD_POT_BB;
    case "flop":
      return potByStreet.preflop ?? PREFLOP_DEAD_POT_BB;
    case "turn":
      return potByStreet.flop ?? potByStreet.preflop ?? PREFLOP_DEAD_POT_BB;
    case "river":
      return (
        potByStreet.turn ??
        potByStreet.flop ??
        potByStreet.preflop ??
        PREFLOP_DEAD_POT_BB
      );
    default:
      return PREFLOP_DEAD_POT_BB;
  }
}

/** Target contribution in BB for export replay (matches live engine). */
export function resolveContributionBbForAction(
  street: StreetState["street"],
  actionType: string,
  sizing: string,
  potAtActionStart: number,
  highestBetBb: number
): number | null {
  if (!["Limp", "Call", "Bet", "Raise"].includes(actionType)) return null;
  if (street === "preflop") {
    return resolvePreflopContributionBb(actionType, sizing, highestBetBb);
  }
  return resolvePostflopContributionBb(
    actionType,
    sizing,
    potAtActionStart,
    highestBetBb,
    0
  );
}

export function buildPreflopRoster(
  positions: string[],
  heroPosition: string,
  heroPositionIndex: number | null,
  villains: { position?: string }[],
  villainCount: number
): StreetPlayer[] {
  const roster: StreetPlayer[] = [
    {
      id: "hero",
      label: "Hero",
      position: heroPosition,
      isHero: true,
      folded: false,
      contribution: 0,
      lastAction: "None",
      actedThisRound: false,
    },
  ];

  for (let i = 0; i < villainCount; i++) {
    const v = villains[i] ?? {};
    roster.push({
      id: `villain_${i}`,
      label: `Villain ${i + 1}`,
      position:
        v.position ||
        positions[((heroPositionIndex ?? 0) + 1 + i) % positions.length],
      isHero: false,
      folded: false,
      contribution: 0,
      lastAction: "None",
      actedThisRound: false,
    });
  }

  return roster.sort(
    (a, b) => positions.indexOf(a.position) - positions.indexOf(b.position)
  );
}

function mapProfilePreflopToStreet(
  label: string,
  highestBet: number
): PreflopActionType | null {
  if (!label) return null;
  if (label === "Fold") return "Fold";
  if (label === "Call") return highestBet > 0 ? "Call" : null;
  if (label === "Limp") return highestBet === 0 ? "Limp" : null;
  if (label === "Raise" || label === "3-Bet" || label === "All-In") {
    return highestBet === 0 ? "Bet" : "Raise";
  }
  return null;
}

function getWizardPreflopSizing(
  hand: Hand,
  player: StreetPlayer,
  streetAction: PreflopActionType
): string {
  if (!player.isHero) return "";
  if (streetAction === "Call" || streetAction === "Bet" || streetAction === "Raise") {
    return hand.preflopAmount || "";
  }
  return "";
}

function getWizardPredeterminedLabel(hand: Hand, player: StreetPlayer): string {
  if (player.isHero) return hand.preflopAction || "";
  const idx = Number.parseInt(player.id.replace("villain_", ""), 10);
  return hand.villains[idx]?.action || "";
}

/** Apply step-7 hero + step-9 villain profile lines in turn order; skip live step 10 when complete. */
export function buildPreflopStateFromWizard(
  hand: Hand,
  baseState: StreetState
): { state: StreetState; roundComplete: boolean } {
  let state: StreetState = { ...baseState };

  for (let guard = 0; guard < 40; guard++) {
    const actor = state.players[state.currentActorIndex];
    if (!actor || actor.folded) break;

    const profileLabel = getWizardPredeterminedLabel(hand, actor);
    const streetAction = mapProfilePreflopToStreet(
      profileLabel,
      state.highestBet
    );
    if (!streetAction) break;

    const valid = getValidPreflopActions(actor, state.highestBet);
    if (!valid.includes(streetAction)) break;

    const sizing = getWizardPreflopSizing(hand, actor, streetAction);
    const result = processStreetAction(state, streetAction, sizing);

    state = {
      ...state,
      street: "preflop",
      players: result.players,
      history: result.history,
      currentActorIndex: result.roundComplete
        ? state.currentActorIndex
        : result.nextActorIndex,
      pot: result.pot,
      highestBet: result.highestBet,
      lastRaiserId: result.lastRaiserId,
      showBetSizes: false,
      currentActionPending: "",
      rememberedHeroAction: undefined,
      rememberedHeroSizing: undefined,
    };

    if (result.roundComplete || result.activeCount <= 1) {
      return { state, roundComplete: true };
    }
  }

  if (state.history.length > 0) {
    const firstActor = state.players[0];
    if (
      !firstActor?.isHero &&
      (hand.preflopAction === "Call" || hand.preflopAction === "3-Bet")
    ) {
      return {
        state: {
          ...state,
          rememberedHeroAction: hand.preflopAction,
          rememberedHeroSizing: hand.preflopAmount || undefined,
        },
        roundComplete: false,
      };
    }
    return { state, roundComplete: false };
  }

  return {
    state: seedPreflopFromHeroSummary(
      baseState,
      hand.preflopAction,
      hand.preflopAmount
    ),
    roundComplete: false,
  };
}

/** If hero is first to act, apply step-7 summary so live logging continues from the next seat. */
export function seedPreflopFromHeroSummary(
  state: StreetState,
  heroSummary: string,
  sizing = ""
): StreetState {
  const base: StreetState = {
    ...state,
    history: [],
    pot: state.pot ?? PREFLOP_DEAD_POT_BB,
    potByStreet: state.potByStreet ?? {},
    highestBet: 0,
    lastRaiserId: null,
    showBetSizes: false,
    currentActionPending: "",
  };

  if (!heroSummary || heroSummary === "Fold") {
    return { ...base, currentActorIndex: 0 };
  }

  const firstActor = state.players[0];
  if (!firstActor?.isHero) {
    return {
      ...base,
      currentActorIndex: 0,
      rememberedHeroAction:
        heroSummary === "Call" || heroSummary === "3-Bet"
          ? heroSummary
          : undefined,
      rememberedHeroSizing: sizing || undefined,
    };
  }

  if (heroSummary === "Call") {
    return { ...base, currentActorIndex: 0 };
  }

  const heroIndex = state.players.findIndex((p) => p.isHero);
  let actionType = "Bet";
  if (heroSummary === "Limp") actionType = "Limp";
  else if (heroSummary === "Raise") actionType = "Bet";
  else if (heroSummary === "3-Bet" || heroSummary === "All-In") actionType = "Raise";

  const result = processStreetAction(
    { ...base, currentActorIndex: heroIndex },
    actionType,
    sizing
  );

  return {
    ...base,
    street: "preflop",
    players: result.players,
    history: result.history,
    currentActorIndex: result.roundComplete
      ? heroIndex
      : result.nextActorIndex,
    pot: result.pot,
    highestBet: result.highestBet,
    lastRaiserId: result.lastRaiserId,
    showBetSizes: false,
    currentActionPending: "",
    rememberedHeroAction: undefined,
    rememberedHeroSizing: undefined,
  };
}

/** Preflop: only show actions that make sense for current bet level. */
export function getValidPreflopActions(
  player: StreetPlayer,
  highestBet: number
): PreflopActionType[] {
  if (player.folded) return [];

  const matched = player.contribution >= highestBet;

  if (highestBet === 0) {
    if (matched && player.actedThisRound) {
      return ["Fold", "Check", "Bet"];
    }
    return ["Fold", "Limp", "Bet"];
  }

  if (!matched) {
    return ["Fold", "Call", "Raise"];
  }

  return ["Fold", "Check", "Raise"];
}

/** Postflop: check/bet when unopened; fold/call/raise when facing a bet. */
export function getValidPostflopActions(
  player: StreetPlayer,
  highestBet: number
): PostflopActionType[] {
  if (player.folded) return [];

  if (highestBet === 0) {
    return ["Check", "Bet"];
  }

  return ["Fold", "Call", "Raise"];
}

export function applyActionToPlayer(
  player: StreetPlayer,
  actionType: string,
  highestBet: number
): StreetPlayer {
  let contribution = player.contribution;
  let lastAction = actionType;

  if (actionType === "Check") {
    lastAction = "Check";
  } else if (actionType === "Limp") {
    lastAction = "Limp";
    contribution = Math.max(contribution, 1);
  } else if (actionType === "Call") {
    lastAction = "Call";
    contribution = highestBet;
  } else if (actionType === "Bet") {
    lastAction = "Bet";
    contribution = highestBet === 0 ? 1 : highestBet + 1;
  } else if (actionType === "Raise") {
    lastAction = "Raise";
    contribution = highestBet + 1;
  } else if (actionType === "Fold") {
    return { ...player, lastAction: "Fold", folded: true, actedThisRound: true };
  }

  return {
    ...player,
    lastAction,
    contribution,
    actedThisRound: true,
    folded: false,
  };
}

export function getUpdatedBetLevel(
  actionType: string,
  highestBet: number,
  newContribution: number
): { highestBet: number; lastRaiserId: string | null } {
  if (actionType === "Bet" && highestBet === 0) {
    return { highestBet: 1, lastRaiserId: null };
  }
  if (actionType === "Bet" || actionType === "Raise") {
    return { highestBet: newContribution, lastRaiserId: null };
  }
  if (actionType === "Limp" && highestBet === 0) {
    return { highestBet: 1, lastRaiserId: null };
  }
  return { highestBet, lastRaiserId: null };
}

export function findNextActorIndex(players: StreetPlayer[], fromIndex: number): number {
  let nextIdx = (fromIndex + 1) % players.length;
  let guard = 0;
  while (players[nextIdx].folded && guard < players.length) {
    nextIdx = (nextIdx + 1) % players.length;
    guard++;
  }
  return nextIdx;
}

export function isBettingRoundComplete(
  players: StreetPlayer[],
  highestBet: number,
  nextActorIndex: number
): boolean {
  const active = players.filter((p) => !p.folded);

  if (active.length <= 1) return true;

  if (highestBet === 0) {
    return active.every((p) => p.actedThisRound);
  }

  const nextActor = players[nextActorIndex];
  return (
    nextActor.contribution === highestBet && nextActor.actedThisRound
  );
}

export type ProcessActionResult = {
  players: StreetPlayer[];
  history: string[];
  pot: number;
  potByStreet: PotByStreet;
  highestBet: number;
  lastRaiserId: string | null;
  roundComplete: boolean;
  nextActorIndex: number;
  activeCount: number;
};

export function processStreetAction(
  state: StreetState,
  actionType: string,
  sizing = ""
): ProcessActionResult {
  const currentActor = state.players[state.currentActorIndex];
  const contributionBefore = currentActor.contribution;
  const resolvedContribution = resolveContributionBb(state, actionType, sizing, currentActor);

  const updatedPlayers = state.players.map((p, idx) => {
    if (idx !== state.currentActorIndex) return p;
    const applied = applyActionToPlayer(p, actionType, state.highestBet);
    if (resolvedContribution != null) {
      return { ...applied, contribution: resolvedContribution };
    }
    return applied;
  });

  let actionText = `${currentActor.label} (${currentActor.position}) ${actionType}`;
  if (sizing) actionText += ` [${sizing}]`;
  const history = [...state.history, actionText];

  const actorAfter = updatedPlayers[state.currentActorIndex];
  let pot = state.pot ?? (state.street === "preflop" ? PREFLOP_DEAD_POT_BB : 0);
  if (resolvedContribution != null) {
    pot += Math.max(0, actorAfter.contribution - contributionBefore);
  }

  let highestBet = maxContributionBb(updatedPlayers);
  let lastRaiserId = state.lastRaiserId;

  if (actionType === "Bet" || actionType === "Raise") {
    lastRaiserId = currentActor.id;
  } else if (actionType === "Limp" && highestBet < 1) {
    highestBet = 1;
  }

  const activeRemaining = updatedPlayers.filter((p) => !p.folded);
  const activeCount = activeRemaining.length;

  let potByStreet = state.potByStreet ?? {};

  if (activeCount <= 1) {
    potByStreet = snapshotPotForStreet(potByStreet, state.street, pot);
    return {
      players: updatedPlayers,
      history,
      pot,
      potByStreet,
      highestBet,
      lastRaiserId,
      roundComplete: true,
      nextActorIndex: state.currentActorIndex,
      activeCount,
    };
  }

  const nextIdx = findNextActorIndex(updatedPlayers, state.currentActorIndex);
  const roundComplete = isBettingRoundComplete(
    updatedPlayers,
    highestBet,
    nextIdx
  );

  if (roundComplete) {
    potByStreet = snapshotPotForStreet(potByStreet, state.street, pot);
  }

  return {
    players: updatedPlayers,
    history,
    pot,
    potByStreet,
    highestBet,
    lastRaiserId,
    roundComplete,
    nextActorIndex: nextIdx,
    activeCount,
  };
}

export function parseHeroPreflopLine(
  preflopActions: string[]
): "Fold" | "Limp" | "Call" | "Raise" | "Check" | "" {
  const heroLines = preflopActions.filter((a) => a.startsWith("Hero"));
  if (heroLines.length === 0) return "";

  const last = heroLines[heroLines.length - 1];
  if (last.includes(" Fold")) return "Fold";
  if (last.includes(" Limp")) return "Limp";
  if (last.includes(" Call")) return "Call";
  if (last.includes(" Raise") || last.includes(" Bet")) return "Raise";
  if (last.includes(" Check")) return "Check";
  return "";
}

export function syncVillainActionsFromLog(
  villains: import("./types").Villain[],
  preflopActions: string[],
  villainCount: number
): import("./types").Villain[] {
  return Array.from({ length: villainCount }, (_, i) => {
    const existing = villains[i] ?? {};
    const lines = preflopActions.filter((a) => a.startsWith(`Villain ${i + 1}`));
    const last = lines[lines.length - 1] ?? "";
    let action = existing.action;
    if (last.includes(" Fold")) action = "Fold";
    else if (last.includes(" Raise") || last.includes(" Bet")) action = "Raise";
    else if (last.includes(" Call") || last.includes(" Limp")) action = "Call";

    return { ...existing, action };
  });
}
