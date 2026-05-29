"use client";

import { useState } from "react";
import {
  ACTIONS,
  isPresetPreflopBbAmount,
  PREFLOP_BB_SIZINGS,
  preflopBbToAmount,
} from "@/lib/constants";
import { playHaptic } from "@/lib/haptics";
import { formatBbAsDollars } from "@/lib/session-math";
import type { Hand } from "@/lib/types";

export type WizardStepHeroPreflopProps = {
  hand: Hand;
  bigBlind: number;
  onActionChange: (action: string, amount?: string) => void;
  onNext: () => void;
};

export function WizardStepHeroPreflop({
  hand,
  bigBlind,
  onActionChange,
  onNext,
}: WizardStepHeroPreflopProps) {
  const [preflopCustomOpen, setPreflopCustomOpen] = useState(false);

  const advanceToVillainCount = () => {
    setTimeout(() => onNext(), 150);
  };

  const showSizing =
    hand.preflopAction &&
    hand.preflopAction !== "Fold" &&
    hand.preflopAction !== "Limp";

  return (
    <div className="space-y-4 flex-1 animate-fadeIn">
      <p className="text-xs text-slate-400 text-center">
        What was your preflop action? You will log the full betting round with
        villains on the next steps.
      </p>

      <div className="grid grid-cols-3 gap-2">
        {ACTIONS.map((act) => (
          <button
            key={act}
            type="button"
            onClick={() => {
              playHaptic("click");
              if (act === "Fold" || act === "Limp") {
                onActionChange(act, "");
                advanceToVillainCount();
              } else {
                setPreflopCustomOpen(false);
                onActionChange(act);
              }
            }}
            className={`p-4 rounded-xl text-xs font-black transition-all ${
              hand.preflopAction === act
                ? "bg-poker-primary text-slate-950 glow-green"
                : "bg-slate-950 border border-slate-900 text-slate-400 hover:border-slate-800"
            }`}
          >
            {act}
          </button>
        ))}
      </div>

      {showSizing && (
        <div className="space-y-3 pt-4 border-t border-slate-900 animate-fadeIn">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest font-semibold block">
            Select open size (BB)
          </label>

          <div className="grid grid-cols-3 gap-2">
            {PREFLOP_BB_SIZINGS.map((size) => {
              const amount = preflopBbToAmount(size.bb);
              const dollarHint =
                typeof size.bb === "number"
                  ? formatBbAsDollars(size.bb, bigBlind)
                  : null;
              return (
                <button
                  key={size.label}
                  type="button"
                  onClick={() => {
                    playHaptic("success");
                    setPreflopCustomOpen(false);
                    onActionChange(hand.preflopAction, amount);
                    advanceToVillainCount();
                  }}
                  className={`py-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-0.5 ${
                    hand.preflopAmount === amount && !preflopCustomOpen
                      ? "bg-poker-accent text-slate-950 border-poker-accent glow-gold"
                      : "bg-slate-950 border-slate-900 text-slate-400 hover:border-slate-800"
                  }`}
                >
                  <span>{size.label}</span>
                  {dollarHint && (
                    <span className="text-[9px] opacity-80">{dollarHint}</span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                playHaptic("click");
                setPreflopCustomOpen(true);
                onActionChange(hand.preflopAction, "");
              }}
              className={`py-3 rounded-xl text-xs font-bold border transition-all ${
                preflopCustomOpen ||
                (hand.preflopAmount &&
                  !isPresetPreflopBbAmount(hand.preflopAmount))
                  ? "bg-poker-accent text-slate-950 border-poker-accent glow-gold"
                  : "bg-slate-950 border-slate-900 text-slate-400 hover:border-slate-800"
              }`}
            >
              Custom
            </button>
          </div>

          {preflopCustomOpen && (
            <div className="space-y-2 pt-1 animate-fadeIn">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest block">
                Custom size (BB)
              </span>
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0.5"
                  placeholder="e.g. 7.5"
                  value={
                    hand.preflopAmount &&
                    !isPresetPreflopBbAmount(hand.preflopAmount)
                      ? hand.preflopAmount
                      : ""
                  }
                  onChange={(e) =>
                    onActionChange(hand.preflopAction, e.target.value)
                  }
                  className="flex-1 p-3 rounded-xl bg-slate-950 border border-slate-900 focus:border-poker-primary text-white text-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const bb = Number(hand.preflopAmount);
                    if (bb > 0) {
                      playHaptic("success");
                      onNext();
                    }
                  }}
                  className="px-4 bg-poker-primary text-slate-950 rounded-xl font-bold text-xs"
                >
                  Confirm
                </button>
              </div>
              {hand.preflopAmount &&
                !isPresetPreflopBbAmount(hand.preflopAmount) &&
                Number(hand.preflopAmount) > 0 && (
                  <p className="text-[10px] text-slate-500 text-center">
                    ≈ {formatBbAsDollars(Number(hand.preflopAmount), bigBlind)}
                  </p>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
