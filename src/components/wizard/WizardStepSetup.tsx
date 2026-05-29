"use client";

import { playHaptic } from "@/lib/haptics";
import { buildInitialVillains } from "@/lib/positions";
import type { Hand } from "@/lib/types";

const EFFECTIVE_STACK_PRESETS = ["33 BB", "50 BB", "75 BB", "100 BB"] as const;

export type WizardStepSetupProps = {
  wizardStep: number;
  hand: Hand;
  bigBlind: number;
  tableSize: number;
  positions: string[];
  onHandChange: (updates: Partial<Hand>) => void;
  onNext: () => void;
  /** Step 8 with 0 villains jumps to outcome (step 20), not sequential onNext. */
  onNavigateToStep?: (step: number) => void;
};

export function WizardStepSetup({
  wizardStep,
  hand,
  bigBlind: _bigBlind,
  tableSize,
  positions,
  onHandChange,
  onNext,
  onNavigateToStep,
}: WizardStepSetupProps) {
  if (wizardStep === 3) {
    return (
      <div className="space-y-4 text-center flex-1 flex flex-col justify-center animate-fadeIn">
        <p className="text-xs text-slate-400">
          Select effective stack size in big blinds (BB) for this hand.
        </p>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {EFFECTIVE_STACK_PRESETS.map((label) => {
            const val = Number.parseInt(label, 10);
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  playHaptic("success");
                  onHandChange({ effectiveStack: label });
                  setTimeout(() => onNext(), 150);
                }}
                className={`py-4 rounded-2xl font-black text-lg border transition-all ${
                  hand.effectiveStack === label
                    ? "bg-poker-primary border-poker-primary text-slate-950 glow-green"
                    : "bg-slate-950 border-slate-900 text-slate-400 hover:border-slate-800"
                }`}
              >
                {val} BB
              </button>
            );
          })}
        </div>

        <div className="space-y-2 pt-4 border-t border-slate-900/60">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
            Or custom manual entry (BB)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="e.g. 150"
              value={
                hand.effectiveStack &&
                !EFFECTIVE_STACK_PRESETS.includes(
                  hand.effectiveStack as (typeof EFFECTIVE_STACK_PRESETS)[number]
                )
                  ? hand.effectiveStack.replace(" BB", "")
                  : ""
              }
              onChange={(e) =>
                onHandChange({
                  effectiveStack: e.target.value ? `${e.target.value} BB` : "",
                })
              }
              className="flex-1 p-3 rounded-xl bg-slate-950 border border-slate-900 focus:border-poker-primary text-white font-medium text-sm transition-colors focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (hand.effectiveStack) {
                  playHaptic("success");
                  onNext();
                }
              }}
              className="px-5 bg-poker-primary hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-xs"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (wizardStep === 4) {
    return (
      <div className="space-y-4 flex-1 flex flex-col justify-center animate-fadeIn">
        <p className="text-xs text-slate-400 text-center">
          Tap your physical seat position below to calibrate metrics tracking.
        </p>

        <div className="relative aspect-[4/3] bg-emerald-950/20 rounded-3xl border border-emerald-800/40 p-3 flex flex-col justify-between overflow-hidden shadow-inner">
          <div className="absolute inset-8 border border-emerald-500/20 rounded-full flex items-center justify-center bg-emerald-900/10">
            <div className="text-center">
              <span className="text-[10px] text-emerald-500/60 font-black uppercase tracking-widest">
                TABLE FLOW
              </span>
              <p className="text-xs font-bold text-emerald-300">{tableSize}-Max</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 h-full relative z-10">
            {positions.map((pos, idx) => {
              const isSelected = hand.heroPositionIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    playHaptic("success");
                    onHandChange({
                      heroPosition: pos,
                      heroPositionIndex: idx,
                    });
                    setTimeout(() => onNext(), 150);
                  }}
                  className={`p-2 rounded-2xl flex flex-col items-center justify-center border transition-all ${
                    isSelected
                      ? "bg-poker-primary border-poker-primary text-slate-950 font-black glow-green scale-105"
                      : "bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <span className="text-xs font-black">{pos}</span>
                  <span className="text-[8px] opacity-75">Seat {idx + 1}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (wizardStep === 8) {
    return (
      <div className="space-y-4 text-center flex-1 flex flex-col justify-center animate-fadeIn">
        <p className="text-xs text-slate-400">
          How many players remained active in this hand against you preflop?
        </p>

        <div className="grid grid-cols-6 gap-2 pt-6">
          {[0, 1, 2, 3, 4, 5].map((cnt) => (
            <button
              key={cnt}
              type="button"
              onClick={() => {
                playHaptic("success");
                if (cnt === 0) {
                  onHandChange({
                    villainCount: 0,
                    result: "Won",
                    notes: hand.notes || "Everyone folded preflop.",
                  });
                  setTimeout(() => onNavigateToStep?.(20), 200);
                } else {
                  onHandChange({
                    villainCount: cnt,
                    villains: buildInitialVillains(
                      positions,
                      hand.heroPositionIndex,
                      hand.preflopAction,
                      cnt
                    ),
                  });
                  setTimeout(() => onNext(), 150);
                }
              }}
              className={`py-4 rounded-xl text-sm font-extrabold transition-all ${
                hand.villainCount === cnt
                  ? "bg-poker-primary text-slate-950 glow-green"
                  : "bg-slate-950 border border-slate-900 text-slate-400 hover:border-slate-800"
              }`}
            >
              {cnt === 5 ? "5+" : cnt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
