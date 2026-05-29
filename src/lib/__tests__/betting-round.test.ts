import { describe, expect, it } from "vitest";
import {
  buildPreflopRoster,
  createPreflopStreetBase,
  PREFLOP_DEAD_POT_BB,
  processStreetAction,
  resolveContributionBbForAction,
  type ProcessActionResult,
  type StreetState,
} from "../betting-round";
import type { PotByStreet, StreetPlayer } from "../types";

const POSITIONS_6 = ["UTG", "MP", "CO", "BTN", "SB", "BB"];

function makePreflopState(
  villainCount: number,
  options: {
    heroPosition?: string;
    heroPositionIndex?: number;
    villainPositions?: string[];
    currentActorIndex?: number;
  } = {}
): StreetState {
  const heroPosition = options.heroPosition ?? "CO";
  const heroPositionIndex =
    options.heroPositionIndex ?? POSITIONS_6.indexOf(heroPosition);
  const villains = Array.from({ length: villainCount }, (_, i) => ({
    position:
      options.villainPositions?.[i] ?? (["BTN", "SB", "BB"][i] as string),
  }));

  const roster = buildPreflopRoster(
    POSITIONS_6,
    heroPosition,
    heroPositionIndex,
    villains,
    villainCount,
    100
  );

  return createPreflopStreetBase({
    players: roster,
    currentActorIndex: options.currentActorIndex ?? 0,
  });
}

function runAction(
  state: StreetState,
  actionType: string,
  sizing = ""
): { state: StreetState; result: ProcessActionResult } {
  const result = processStreetAction(state, actionType, sizing);
  const nextState: StreetState = {
    ...state,
    players: result.players,
    history: result.history,
    pot: result.pot,
    potByStreet: result.potByStreet,
    highestBet: result.highestBet,
    lastRaiserId: result.lastRaiserId,
    currentActorIndex: result.nextActorIndex,
  };
  return { state: nextState, result };
}

function playerById(state: StreetState, id: string) {
  const p = state.players.find((pl) => pl.id === id);
  if (!p) throw new Error(`Player ${id} not found`);
  return p;
}

const START_STACK_BB = 100;

function makeHeadsUpFlopState(potBb = 10): StreetState {
  const roster = buildPreflopRoster(
    POSITIONS_6,
    "CO",
    3,
    [{ position: "BTN" }],
    1,
    START_STACK_BB
  );
  return {
    ...createPreflopStreetBase({ players: roster }),
    street: "flop",
    pot: potBb,
    potByStreet: { preflop: 7.5 },
    highestBet: 0,
    currentActorIndex: 0,
  };
}

/** Mirrors HandWizard initStreetState carry for remainingStack between streets. */
function initNextStreet(
  prev: StreetState,
  street: "turn" | "river",
  pot: number,
  potByStreet: PotByStreet
): StreetState {
  const players: StreetPlayer[] = prev.players
    .filter((p) => !p.folded)
    .map((p) => ({
      ...p,
      contribution: 0,
      actedThisRound: false,
      lastAction: "None",
      remainingStack: p.remainingStack ?? START_STACK_BB,
    }));

  return {
    street,
    players,
    history: [],
    currentActorIndex: 0,
    pot,
    potByStreet,
    highestBet: 0,
    lastRaiserId: null,
    showBetSizes: false,
    currentActionPending: "",
  };
}

describe("preflop contributions", () => {
  it("hero opens 3BB: contribution=3, highestBet=3, pot delta=3", () => {
    const base = makePreflopState(1);
    const potBefore = base.pot ?? PREFLOP_DEAD_POT_BB;
    const { state, result } = runAction(base, "Bet", "3");
    const hero = playerById(state, "hero");

    expect(hero.contribution).toBe(3);
    expect(result.highestBet).toBe(3);
    expect(state.pot).toBe(potBefore + 3);
  });

  it("villain calls 3BB: contribution=3, pot delta=3 (total pot includes dead pot)", () => {
    let { state } = runAction(makePreflopState(1), "Bet", "3");
    const potBefore = state.pot!;
    const { state: after, result } = runAction(state, "Call");
    const villain = playerById(after, "villain_0");

    expect(villain.contribution).toBe(3);
    expect(after.pot).toBe(potBefore + 3);
    expect(after.pot).toBe(PREFLOP_DEAD_POT_BB + 3 + 3);
    expect(result.highestBet).toBe(3);
  });

  it("hero limps: contribution=1, highestBet=1, pot delta=1", () => {
    const base = makePreflopState(1);
    const potBefore = base.pot ?? PREFLOP_DEAD_POT_BB;
    const { state, result } = runAction(base, "Limp");
    const hero = playerById(state, "hero");

    expect(hero.contribution).toBe(1);
    expect(result.highestBet).toBe(1);
    expect(state.pot).toBe(potBefore + 1);
  });

  it("hero raises to 4BB over a 2BB bet: contribution=4, highestBet=4", () => {
    const base = makePreflopState(1, {
      heroPosition: "BTN",
      heroPositionIndex: 4,
      villainPositions: ["CO"],
    });
    let { state } = runAction(base, "Bet", "2");
    const { state: after, result } = runAction(state, "Raise", "4");
    const hero = playerById(after, "hero");

    expect(hero.contribution).toBe(4);
    expect(result.highestBet).toBe(4);
  });
});

describe("round completion", () => {
  it("heads-up: hero bets, villain calls → roundComplete true", () => {
    let { state, result } = runAction(makePreflopState(1), "Bet", "3");
    ({ state, result } = runAction(state, "Call"));

    expect(result.roundComplete).toBe(true);
    expect(result.activeCount).toBe(2);
  });

  it("heads-up: hero bets, villain folds → roundComplete true", () => {
    let { state, result } = runAction(makePreflopState(1), "Bet", "3");
    ({ state, result } = runAction(state, "Fold"));

    expect(result.roundComplete).toBe(true);
    expect(result.activeCount).toBe(1);
  });

  it("multiway: hero bets 3BB, villain 1 calls, villain 2 folds → roundComplete when hero matched", () => {
    const base = makePreflopState(2, {
      villainPositions: ["BTN", "SB"],
    });
    let { state, result } = runAction(base, "Bet", "3");
    ({ state, result } = runAction(state, "Call"));
    ({ state, result } = runAction(state, "Fold"));

    const hero = playerById(state, "hero");
    expect(result.roundComplete).toBe(true);
    expect(hero.contribution).toBe(3);
    expect(result.highestBet).toBe(3);
  });

  it("unopened: all players check → roundComplete true after last check", () => {
    const roster = buildPreflopRoster(
      POSITIONS_6,
      "CO",
      3,
      [{ position: "BTN" }],
      1,
      100
    );
    let state: StreetState = {
      ...createPreflopStreetBase({ players: roster }),
      street: "flop",
      pot: 10,
      potByStreet: { preflop: 7.5 },
      highestBet: 0,
      currentActorIndex: 0,
    };

    let result: ProcessActionResult;
    ({ state, result } = runAction(state, "Check"));
    ({ state, result } = runAction(state, "Check"));

    expect(result.roundComplete).toBe(true);
    expect(state.pot).toBe(10);
  });
});

describe("pot tracking", () => {
  it("preflop dead pot seeds at 1.5 BB", () => {
    const state = makePreflopState(1);
    expect(state.pot).toBe(PREFLOP_DEAD_POT_BB);
  });

  it("after open 3BB + call: pot = 1.5 + 3 + 3 = 7.5 BB", () => {
    let { state } = runAction(makePreflopState(1), "Bet", "3");
    ({ state } = runAction(state, "Call"));

    expect(state.pot).toBe(7.5);
  });

  it("potByStreet.preflop snapshots on round complete", () => {
    const { result } = runAction(
      runAction(makePreflopState(1), "Bet", "3").state,
      "Call"
    );

    expect(result.roundComplete).toBe(true);
    expect(result.potByStreet.preflop).toBe(7.5);
    expect(result.pot).toBe(7.5);
  });
});

describe("All-In", () => {
  it("hero opens All-In from 100BB: contribution=100, remainingStack=0, pot delta=100", () => {
    const base = makePreflopState(1);
    const potBefore = base.pot ?? PREFLOP_DEAD_POT_BB;
    const { state, result } = runAction(base, "Bet", "all-in");
    const hero = playerById(state, "hero");

    expect(hero.contribution).toBe(100);
    expect(hero.remainingStack).toBe(0);
    expect(result.highestBet).toBe(100);
    expect(state.pot).toBe(potBefore + 100);
  });

  it("hero bets 10BB on flop then goes All-In on turn: commits 90BB not 100", () => {
    let { state } = runAction(makeHeadsUpFlopState(), "Bet", "10");
    const heroAfterFlop = playerById(state, "hero");
    expect(heroAfterFlop.remainingStack).toBe(90);

    const turnState = initNextStreet(state, "turn", state.pot!, {
      ...state.potByStreet,
      flop: state.pot,
    });
    expect(playerById(turnState, "hero").remainingStack).toBe(90);

    const { state: after, result } = runAction(turnState, "Bet", "all-in");
    const hero = playerById(after, "hero");

    expect(hero.contribution).toBe(90);
    expect(hero.remainingStack).toBe(0);
    expect(result.highestBet).toBe(90);
  });

  it("resolveContributionBbForAction returns null for All-In (export has no fabricated amount)", () => {
    expect(
      resolveContributionBbForAction("preflop", "Bet", "all-in", 1.5, 0)
    ).toBeNull();
    expect(
      resolveContributionBbForAction("flop", "Raise", "all-in", 10, 5)
    ).toBeNull();
    expect(
      resolveContributionBbForAction("flop", "All-In", "", 10, 5)
    ).toBeNull();
  });
});

describe("remainingStack carry", () => {
  it("after 10BB flop bet, villain remainingStack at turn init = startStack - 10", () => {
    let { state } = runAction(makeHeadsUpFlopState(), "Check");
    ({ state } = runAction(state, "Bet", "10"));

    expect(playerById(state, "villain_0").remainingStack).toBe(90);

    const turnState = initNextStreet(state, "turn", state.pot!, {
      ...state.potByStreet,
      flop: state.pot,
    });
    expect(playerById(turnState, "villain_0").remainingStack).toBe(90);
  });

  it("after checks on turn, remainingStack unchanged at river init", () => {
    let { state } = runAction(makeHeadsUpFlopState(), "Check");
    ({ state } = runAction(state, "Check"));

    const turnState = initNextStreet(state, "turn", state.pot!, {
      ...state.potByStreet,
      flop: state.pot,
    });
    let { state: turnPlay } = runAction(turnState, "Check");
    ({ state: turnPlay } = runAction(turnPlay, "Check"));

    const riverState = initNextStreet(turnPlay, "river", turnPlay.pot!, {
      ...turnPlay.potByStreet,
      turn: turnPlay.pot,
    });

    expect(playerById(riverState, "hero").remainingStack).toBe(START_STACK_BB);
    expect(playerById(riverState, "villain_0").remainingStack).toBe(
      START_STACK_BB
    );
  });
});

describe("postflop fractional sizing", () => {
  it("pot 10BB at flop start; hero bets 1/2 → contribution=5, pot delta=5", () => {
    const base = makeHeadsUpFlopState(10);
    const potBefore = base.pot!;
    const { state, result } = runAction(base, "Bet", "1/2");
    const hero = playerById(state, "hero");

    expect(hero.contribution).toBe(5);
    expect(result.highestBet).toBe(5);
    expect(state.pot).toBe(potBefore + 5);
  });

  it("pot 10BB at flop start; hero bets pot → contribution=10, pot delta=10", () => {
    const base = makeHeadsUpFlopState(10);
    const potBefore = base.pot!;
    const { state, result } = runAction(base, "Bet", "pot");
    const hero = playerById(state, "hero");

    expect(hero.contribution).toBe(10);
    expect(result.highestBet).toBe(10);
    expect(state.pot).toBe(potBefore + 10);
  });

  it("pot 10BB at flop start; hero bets 1/3 → contribution=10/3, pot delta=10/3", () => {
    const base = makeHeadsUpFlopState(10);
    const potBefore = base.pot!;
    const { state } = runAction(base, "Bet", "1/3");
    const hero = playerById(state, "hero");
    const third = 10 / 3;

    expect(hero.contribution).toBeCloseTo(third, 5);
    expect(state.pot).toBeCloseTo(potBefore + third, 5);
  });
});

describe("round completion postflop", () => {
  it("unopened flop: hero checks, villain checks → roundComplete true", () => {
    let { state, result } = runAction(makeHeadsUpFlopState(), "Check");
    ({ state, result } = runAction(state, "Check"));

    expect(result.roundComplete).toBe(true);
    expect(state.pot).toBe(10);
  });

  it("hero bets, villain raises, hero calls → roundComplete true", () => {
    let { state, result } = runAction(makeHeadsUpFlopState(10), "Bet", "1/2");
    ({ state, result } = runAction(state, "Raise", "1/2"));
    ({ state, result } = runAction(state, "Call"));

    expect(result.roundComplete).toBe(true);
    expect(result.highestBet).toBeCloseTo(12.5, 5);
    expect(playerById(state, "hero").contribution).toBeCloseTo(12.5, 5);
  });
});
