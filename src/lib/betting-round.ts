import type { StreetPlayer, StreetState } from "./types";

export type PreflopActionType = "Fold" | "Limp" | "Call" | "Check" | "Bet" | "Raise";
export type PostflopActionType = "Fold" | "Call" | "Check" | "Bet" | "Raise";

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

/** If hero is first to act, apply step-7 summary so live logging continues from the next seat. */
export function seedPreflopFromHeroSummary(
  state: StreetState,
  heroSummary: string,
  sizing = ""
): StreetState {
  const base: StreetState = {
    ...state,
    history: [],
    highestBet: 0,
    lastRaiserId: null,
    showBetSizes: false,
    currentActionPending: "",
  };

  if (!heroSummary || heroSummary === "Fold" || heroSummary === "Call") {
    return { ...base, currentActorIndex: 0 };
  }

  const firstActor = state.players[0];
  if (!firstActor?.isHero) {
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
    street: "preflop",
    players: result.players,
    history: result.history,
    currentActorIndex: result.roundComplete
      ? heroIndex
      : result.nextActorIndex,
    highestBet: result.highestBet,
    lastRaiserId: result.lastRaiserId,
    showBetSizes: false,
    currentActionPending: "",
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
  const updatedPlayers = state.players.map((p, idx) =>
    idx === state.currentActorIndex
      ? applyActionToPlayer(p, actionType, state.highestBet)
      : p
  );

  let actionText = `${currentActor.label} (${currentActor.position}) ${actionType}`;
  if (sizing) actionText += ` [${sizing}]`;
  const history = [...state.history, actionText];

  const actorAfter = updatedPlayers[state.currentActorIndex];
  let highestBet = state.highestBet;
  let lastRaiserId = state.lastRaiserId;

  if (actionType === "Bet" && highestBet === 0) {
    highestBet = 1;
    lastRaiserId = currentActor.id;
  } else if (actionType === "Bet" || actionType === "Raise") {
    highestBet = actorAfter.contribution;
    lastRaiserId = currentActor.id;
  } else if (actionType === "Limp" && highestBet === 0) {
    highestBet = 1;
  }

  const activeRemaining = updatedPlayers.filter((p) => !p.folded);
  const activeCount = activeRemaining.length;

  if (activeCount <= 1) {
    return {
      players: updatedPlayers,
      history,
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

  return {
    players: updatedPlayers,
    history,
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
