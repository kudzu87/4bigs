"use client";

import { useCallback, useState } from "react";
import {
  PREFLOP_DEAD_POT_BB,
  parseEffectiveStackBb,
  processStreetAction,
  type ProcessActionResult,
} from "@/lib/betting-round";
import { playHaptic } from "@/lib/haptics";
import { getPostflopWeight } from "@/lib/positions";
import type { Hand, StreetPlayer, StreetState } from "@/lib/types";

export function useStreetState(
  hand: Hand,
  positions: string[],
  _bigBlind: number,
  onRoundComplete: (street: string, result: ProcessActionResult) => void
): {
  streetState: StreetState;
  setStreetState: React.Dispatch<React.SetStateAction<StreetState>>;
  initStreetState: (street: "flop" | "turn" | "river") => void;
  handlePlayerAction: (actionType: string, sizing?: string) => void;
} {
  const [streetState, setStreetState] = useState<StreetState>({
    street: "flop",
    players: [],
    history: [],
    currentActorIndex: 0,
    pot: PREFLOP_DEAD_POT_BB,
    potByStreet: {},
    highestBet: 0,
    lastRaiserId: null,
    showBetSizes: false,
    currentActionPending: "",
  });

  const tableSize = positions.length;

  const initStreetState = useCallback(
    (streetName: "flop" | "turn" | "river") => {
      setStreetState((prev) => {
        if (prev.street === streetName && prev.players.length > 0) {
          return prev;
        }

        const roster: StreetPlayer[] = [];
        const defaultStackBb = parseEffectiveStackBb(hand.effectiveStack) ?? 0;
        const prevStackById = Object.fromEntries(
          prev.players.map((p) => [p.id, p.remainingStack ?? defaultStackBb])
        );

        const heroFoldedPreflop =
          hand.preflopFolded || hand.preflopAction === "Fold";
        const heroFoldedFlop = streetName !== "flop" && hand.flopFolded;
        const heroFoldedTurn = streetName === "river" && hand.turnFolded;

        roster.push({
          id: "hero",
          label: "Hero",
          position: hand.heroPosition,
          isHero: true,
          folded: !!(heroFoldedPreflop || heroFoldedFlop || heroFoldedTurn),
          contribution: 0,
          remainingStack: prevStackById.hero ?? defaultStackBb,
          lastAction: "None",
          actedThisRound: false,
        });

        hand.villains.forEach((v, idx) => {
          const villainFoldedPreflop = v.action === "Fold";
          const villainFoldedFlop = streetName !== "flop" && v.flopFolded;
          const villainFoldedTurn = streetName === "river" && v.turnFolded;
          const villainId = `villain_${idx}`;

          roster.push({
            id: villainId,
            label: `Villain ${idx + 1}`,
            position:
              v.position ||
              positions[
                ((hand.heroPositionIndex ?? 0) + idx + 1) % tableSize
              ],
            isHero: false,
            folded: !!(
              villainFoldedPreflop ||
              villainFoldedFlop ||
              villainFoldedTurn
            ),
            contribution: 0,
            remainingStack: prevStackById[villainId] ?? defaultStackBb,
            lastAction: "None",
            actedThisRound: false,
          });
        });

        const activeOnStreet = roster.filter((p) => !p.folded);
        const sortedActive = activeOnStreet.sort(
          (a, b) => getPostflopWeight(a.position) - getPostflopWeight(b.position)
        );

        const potByStreet = {
          ...hand.potByStreet,
          ...prev.potByStreet,
        };
        let pot = prev.pot ?? PREFLOP_DEAD_POT_BB;
        if (streetName === "flop") {
          pot =
            potByStreet.preflop ?? prev.pot ?? PREFLOP_DEAD_POT_BB;
        } else if (streetName === "turn") {
          pot =
            potByStreet.flop ?? potByStreet.preflop ?? prev.pot ?? pot;
        } else if (streetName === "river") {
          pot =
            potByStreet.turn ??
            potByStreet.flop ??
            potByStreet.preflop ??
            prev.pot ??
            pot;
        }

        return {
          street: streetName,
          players: sortedActive,
          history: [],
          currentActorIndex: 0,
          pot,
          potByStreet,
          highestBet: 0,
          lastRaiserId: null,
          showBetSizes: false,
          currentActionPending: "",
        };
      });
    },
    [hand, positions, tableSize]
  );

  const handlePlayerAction = useCallback(
    (actionType: string, sizing = "") => {
      const result = processStreetAction(streetState, actionType, sizing);
      const street = streetState.street;

      if (result.activeCount <= 1 || result.roundComplete) {
        playHaptic("success");

        setStreetState((prev) => ({
          ...prev,
          players: result.players,
          history: result.history,
          pot: result.pot,
          potByStreet: result.potByStreet,
          highestBet: result.highestBet,
          lastRaiserId: result.lastRaiserId,
        }));

        onRoundComplete(street, result);
        return;
      }

      setStreetState((prev) => ({
        ...prev,
        players: result.players,
        history: result.history,
        pot: result.pot,
        potByStreet: result.potByStreet,
        currentActorIndex: result.nextActorIndex,
        highestBet: result.highestBet,
        lastRaiserId: result.lastRaiserId,
        showBetSizes: false,
        currentActionPending: "",
        currentActionPendingCustom: false,
      }));
    },
    [streetState, onRoundComplete]
  );

  return {
    streetState,
    setStreetState,
    initStreetState,
    handlePlayerAction,
  };
}
