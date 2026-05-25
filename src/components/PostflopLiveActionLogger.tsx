"use client";

import { formatPostflopSizingLabel, POSTFLOP_SIZINGS } from "@/lib/constants";
import {
  getValidPostflopActions,
  resolvePostflopWagerBb,
} from "@/lib/betting-round";
import { playHaptic } from "@/lib/haptics";
import { formatBbAsDollars } from "@/lib/session-math";
import type { Hand, StreetState } from "@/lib/types";

export type PostflopLiveActionLoggerProps = {
  streetState: StreetState;
  setStreetState: React.Dispatch<React.SetStateAction<StreetState>>;
  handlePlayerAction: (actionType: string, sizing?: string) => void;
  skipToOutcome: () => void;
  getSuitColor: (suit: string) => string;
  hand: Hand;
  /** Current pot in BB (updates as actions are logged on this street). */
  potBb: number;
  bigBlind: number;
};

export function PostflopLiveActionLogger({
  streetState,
  setStreetState,
  handlePlayerAction,
  skipToOutcome,
  getSuitColor,
  hand,
  potBb,
  bigBlind,
}: PostflopLiveActionLoggerProps) {
  const customInputId = `postflopCustomSizing-${streetState.street}`;
  const currentActor = streetState.players[streetState.currentActorIndex];
  const hasBetOccurred = streetState.highestBet > 0;
  const validActions = currentActor
    ? getValidPostflopActions(currentActor, streetState.highestBet)
    : [];

  const sizingOptions = POSTFLOP_SIZINGS;

  if (!currentActor) {
    return (
      <div className="flex items-center justify-center p-8 text-xs text-slate-500">
        Initializing active players...
      </div>
    );
  }

  const showCheck = validActions.includes("Check");
  const showBet = validActions.includes("Bet");
  const showFold = validActions.includes("Fold");
  const showCall = validActions.includes("Call");
  const showRaise = validActions.includes("Raise");

  return (
    <div className="space-y-4 flex-1 flex flex-col justify-between animate-fadeIn">
      <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-2xl border border-slate-900">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Board:</span>
          <div className="flex gap-1">
            {hand.boardFlop?.map((c, i) => c.rank && (
              <span key={`f-${i}`} className="bg-slate-900 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                {c.rank}<span className={getSuitColor(c.suit)}>{c.suit}</span>
              </span>
            ))}
            {streetState.street !== "flop" && hand.boardTurn?.rank && (
              <span className="bg-slate-900 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                {hand.boardTurn.rank}<span className={getSuitColor(hand.boardTurn.suit)}>{hand.boardTurn.suit}</span>
              </span>
            )}
            {streetState.street === "river" && hand.boardRiver?.rank && (
              <span className="bg-slate-900 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                {hand.boardRiver.rank}<span className={getSuitColor(hand.boardRiver.suit)}>{hand.boardRiver.suit}</span>
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-poker-accent font-black uppercase tracking-widest block">
            {streetState.street} street
          </span>
          <span className="text-[9px] text-slate-400 font-bold">
            Pot {formatBbAsDollars(potBb, bigBlind)} ({potBb} BB)
          </span>
        </div>
      </div>

      <div className="p-4 rounded-3xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center text-center space-y-2 relative shadow-lg">
        <span className="absolute top-3 left-4 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
          Current Turn to Act
        </span>
        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white font-black text-sm mt-3">
          {currentActor.position}
        </div>
        <div>
          <h4 className="font-extrabold text-white text-base">{currentActor.label}</h4>
          <p className="text-[10px] text-slate-500 font-medium">Position: {currentActor.position}</p>
        </div>
        {hasBetOccurred && (
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-extrabold uppercase tracking-wider">
            Facing Bet / Raise
          </span>
        )}
      </div>

      <div className="space-y-3">
        {!streetState.showBetSizes ? (
          <div className="grid grid-cols-2 gap-2">
            {showCheck && (
              <button
                type="button"
                onClick={() => {
                  playHaptic("click");
                  handlePlayerAction("Check");
                }}
                className="py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl font-bold text-sm transition-all shadow-md"
              >
                Check
              </button>
            )}
            {showBet && (
              <button
                type="button"
                onClick={() => {
                  playHaptic("click");
                  setStreetState((prev) => ({
                    ...prev,
                    showBetSizes: true,
                    currentActionPending: "Bet",
                  }));
                }}
                className={`py-3 bg-poker-primary hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-sm transition-all shadow-md glow-green ${showCheck ? "" : "col-span-2"}`}
              >
                Bet
              </button>
            )}
            {showFold && (
              <button
                type="button"
                onClick={() => {
                  playHaptic("click");
                  handlePlayerAction("Fold");
                }}
                className="py-3 bg-rose-950/40 border border-rose-900/60 hover:bg-rose-900/20 text-rose-400 rounded-xl font-bold text-sm transition-all"
              >
                Fold
              </button>
            )}
            {showCall && (
              <button
                type="button"
                onClick={() => {
                  playHaptic("click");
                  handlePlayerAction("Call");
                }}
                className="py-3 bg-sky-950/40 border border-sky-900/60 hover:bg-sky-900/20 text-sky-400 rounded-xl font-extrabold text-sm transition-all"
              >
                Call
              </button>
            )}
            {showRaise && (
              <button
                type="button"
                onClick={() => {
                  playHaptic("click");
                  setStreetState((prev) => ({
                    ...prev,
                    showBetSizes: true,
                    currentActionPending: "Raise",
                  }));
                }}
                className="py-3 col-span-2 bg-poker-accent text-slate-950 rounded-xl font-black text-sm transition-all shadow-md glow-gold"
              >
                Raise
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3 p-3 rounded-2xl bg-slate-950 border border-slate-900 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Select {streetState.currentActionPending} Size
              </span>
              <button
                type="button"
                onClick={() =>
                  setStreetState((prev) => ({
                    ...prev,
                    showBetSizes: false,
                    currentActionPending: "",
                  }))
                }
                className="text-[10px] text-rose-400 font-bold uppercase"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {sizingOptions.map((sz) => {
                const wagerBb =
                  sz !== "custom" && sz !== "all-in"
                    ? resolvePostflopWagerBb(potBb, sz)
                    : null;
                const dollarHint =
                  wagerBb != null ? formatBbAsDollars(wagerBb, bigBlind) : null;

                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => {
                      if (sz !== "custom") {
                        playHaptic("success");
                        handlePlayerAction(streetState.currentActionPending, sz);
                      } else {
                        setStreetState((prev) => ({
                          ...prev,
                          currentActionPendingCustom: true,
                        }));
                      }
                    }}
                    className="py-2.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex flex-col items-center gap-0.5"
                  >
                    <span>{formatPostflopSizingLabel(sz)}</span>
                    {dollarHint && (
                      <span className="text-[9px] text-poker-accent font-extrabold">
                        {dollarHint}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {streetState.currentActionPendingCustom && (
              <div className="space-y-2 pt-1">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest block">
                  Custom size (BB) — {formatBbAsDollars(potBb, bigBlind)} pot
                </span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0.5"
                    placeholder="e.g. 7.5"
                    id={customInputId}
                    className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-900 focus:border-poker-primary text-white text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(
                        customInputId
                      ) as HTMLInputElement | null;
                      const raw = el?.value?.trim();
                      if (raw && Number(raw) > 0) {
                        playHaptic("success");
                        handlePlayerAction(
                          streetState.currentActionPending,
                          raw
                        );
                      }
                    }}
                    className="px-4 bg-poker-primary text-slate-950 rounded-xl font-bold text-xs"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-900 space-y-2">
        <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">
          Action Logs Timeline
        </span>
        {streetState.history.length === 0 ? (
          <p className="text-[10px] text-slate-600 italic">
            No actions logged yet. First actor to speak is {currentActor.label} ({currentActor.position}).
          </p>
        ) : (
          <div className="space-y-1.5 max-h-24 overflow-y-auto font-mono text-[10px]">
            {streetState.history.map((act, idx) => (
              <div key={idx} className="text-slate-300 flex items-center gap-1.5">
                <span className="text-slate-600">[{idx + 1}]</span>
                <span>{act}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={skipToOutcome}
        className="w-full py-2 bg-slate-900 hover:bg-slate-850 text-[10px] text-slate-500 hover:text-slate-300 font-bold uppercase tracking-widest rounded-xl transition-all"
      >
        Skip Directly to outcome
      </button>
    </div>
  );
}
