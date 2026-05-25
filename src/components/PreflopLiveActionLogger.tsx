"use client";

import {
  formatPreflopSizing,
  PREFLOP_LIVE_SIZING_OPTIONS,
  PREFLOP_SIZING_CUSTOM,
} from "@/lib/constants";
import { PREFLOP_DEAD_POT_BB } from "@/lib/betting-round";
import { playHaptic } from "@/lib/haptics";
import { formatBbAsDollars } from "@/lib/session-math";
import { getValidPreflopActions } from "@/lib/betting-round";
import type { Hand, StreetState } from "@/lib/types";

type PreflopLiveActionLoggerProps = {
  streetState: StreetState;
  setStreetState: React.Dispatch<React.SetStateAction<StreetState>>;
  handlePlayerAction: (actionType: string, sizing?: string) => void;
  skipToOutcome: () => void;
  hand: Hand;
  potBb?: number;
  bigBlind?: number;
};

export function PreflopLiveActionLogger({
  streetState,
  setStreetState,
  handlePlayerAction,
  skipToOutcome,
  hand,
  potBb = PREFLOP_DEAD_POT_BB,
  bigBlind = 2,
}: PreflopLiveActionLoggerProps) {
  const currentActor = streetState.players[streetState.currentActorIndex];
  const hasBetOccurred = streetState.highestBet > 0;
  const validActions = currentActor
    ? getValidPreflopActions(currentActor, streetState.highestBet)
    : [];

  if (!currentActor) {
    return (
      <div className="flex items-center justify-center p-8 text-xs text-slate-500">
        Initializing preflop action…
      </div>
    );
  }

  const showLimp = validActions.includes("Limp");
  const showCheck = validActions.includes("Check");
  const showBet = validActions.includes("Bet");
  const showFold = validActions.includes("Fold");
  const showCall = validActions.includes("Call");
  const showRaise = validActions.includes("Raise");

  const openAction = hasBetOccurred ? "Raise" : "Bet";
  const sizingOptions = PREFLOP_LIVE_SIZING_OPTIONS;

  const rememberedHeroAction =
    streetState.rememberedHeroAction ?? hand.preflopAction;
  const rememberedHeroSizing =
    streetState.rememberedHeroSizing ?? hand.preflopAmount;
  const heroCallPreselected =
    currentActor.isHero &&
    rememberedHeroAction === "Call" &&
    showCall &&
    hasBetOccurred;

  return (
    <div className="space-y-4 flex-1 flex flex-col justify-between animate-fadeIn">
      <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-2xl border border-slate-900">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Hole:</span>
          <div className="flex gap-1 font-mono text-[10px]">
            {hand.heroCards.map((c, i) => (
              <span key={i} className="bg-slate-900 px-1.5 py-0.5 rounded font-bold">
                {c.rank}
                {c.suit}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-poker-accent font-black uppercase tracking-widest block">
            Preflop
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

      {heroCallPreselected && (
        <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-700/50 text-center space-y-1">
          <span className="text-[9px] text-sky-400 font-bold uppercase tracking-widest">
            Remembered from step 7
          </span>
          <p className="text-xs font-bold text-sky-200">
            Call
            {rememberedHeroSizing
              ? ` · ${formatPreflopSizing(rememberedHeroSizing)}`
              : ""}{" "}
            — tap Call below to log it
          </p>
        </div>
      )}

      <div className="space-y-3">
        {!streetState.showBetSizes ? (
          <div className="grid grid-cols-2 gap-2">
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
            {showLimp && (
              <button
                type="button"
                onClick={() => {
                  playHaptic("click");
                  handlePlayerAction("Limp");
                }}
                className="py-3 bg-sky-950/40 border border-sky-900/60 hover:bg-sky-900/20 text-sky-400 rounded-xl font-bold text-sm transition-all"
              >
                Limp
              </button>
            )}
            {showCheck && (
              <button
                type="button"
                onClick={() => {
                  playHaptic("click");
                  handlePlayerAction("Check");
                }}
                className="py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl font-bold text-sm transition-all"
              >
                Check
              </button>
            )}
            {showCall && (
              <button
                type="button"
                onClick={() => {
                  playHaptic(heroCallPreselected ? "success" : "click");
                  handlePlayerAction(
                    "Call",
                    heroCallPreselected && rememberedHeroSizing
                      ? rememberedHeroSizing
                      : undefined
                  );
                }}
                className={`py-3 rounded-xl font-extrabold text-sm transition-all ${
                  heroCallPreselected
                    ? "bg-poker-accent text-slate-950 ring-2 ring-poker-accent/60 glow-gold col-span-2"
                    : "bg-sky-950/40 border border-sky-900/60 hover:bg-sky-900/20 text-sky-400"
                }`}
              >
                Call
                {heroCallPreselected && rememberedHeroSizing
                  ? ` (${formatPreflopSizing(rememberedHeroSizing)})`
                  : ""}
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
                    currentActionPending: openAction,
                  }));
                }}
                className={`py-3 bg-poker-primary hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-sm transition-all shadow-md glow-green ${!showFold && !showCall && !showLimp && !showCheck ? "col-span-2" : ""}`}
              >
                {hasBetOccurred ? "Raise" : "Bet"}
              </button>
            )}
            {showRaise && !showBet && (
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
            <div className="grid grid-cols-4 gap-1.5">
              {sizingOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    if (opt.value !== PREFLOP_SIZING_CUSTOM) {
                      playHaptic("success");
                      handlePlayerAction(
                        streetState.currentActionPending,
                        opt.value
                      );
                    } else {
                      setStreetState((prev) => ({
                        ...prev,
                        currentActionPendingCustom: true,
                      }));
                    }
                  }}
                  className="py-2.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {streetState.currentActionPendingCustom && (
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="e.g. 15 BB"
                  id="preflopCustomSizingInput"
                  className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-900 focus:border-poker-primary text-white text-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(
                      "preflopCustomSizingInput"
                    ) as HTMLInputElement | null;
                    if (el?.value) {
                      playHaptic("success");
                      handlePlayerAction(streetState.currentActionPending, el.value);
                    }
                  }}
                  className="px-4 bg-poker-primary text-slate-950 rounded-xl font-bold text-xs"
                >
                  Confirm
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-900 space-y-2">
        <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">
          Preflop Action Log
        </span>
        {streetState.history.length === 0 ? (
          <p className="text-[10px] text-slate-600 italic">
            Action starts with {currentActor.label} ({currentActor.position}).
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
        className="w-full py-2 bg-slate-900 text-[10px] text-slate-500 hover:text-slate-300 font-bold uppercase tracking-widest rounded-xl transition-all"
      >
        Skip to outcome
      </button>
    </div>
  );
}
