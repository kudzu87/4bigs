"use client";

import { useEffect, useState } from "react";
import { formatPreflopSizing, PROFILE_TAGS } from "@/lib/constants";
import { playHaptic } from "@/lib/haptics";
import {
  heroPreflopActsBeforeVillains,
  inferDefaultVillainPreflopAction,
} from "@/lib/positions";
import { formatBbAsDollars } from "@/lib/session-math";
import type { Hand, Villain } from "@/lib/types";
import { isStepComplete } from "@/lib/wizard-navigation";

const VILLAIN_STACK_PRESETS = [33, 50, 75, 100] as const;

export type WizardStepVillainProfileProps = {
  hand: Hand;
  selectedVillainIndex: number;
  setSelectedVillainIndex: (i: number) => void;
  bigBlind: number;
  villainPositionOptions: string[];
  villainPositionHint: string | null;
  onVillainChange: (updatedVillains: Villain[]) => void;
  onNext: () => void;
};

export function WizardStepVillainProfile({
  hand,
  selectedVillainIndex,
  setSelectedVillainIndex,
  bigBlind,
  villainPositionOptions,
  villainPositionHint,
  onVillainChange,
  onNext,
}: WizardStepVillainProfileProps) {
  const [villainStackCustomOpen, setVillainStackCustomOpen] = useState(false);

  useEffect(() => {
    const stackBb = hand.villains[selectedVillainIndex]?.stackBb;
    setVillainStackCustomOpen(
      stackBb != null &&
        !VILLAIN_STACK_PRESETS.includes(
          stackBb as (typeof VILLAIN_STACK_PRESETS)[number]
        )
    );
  }, [selectedVillainIndex, hand.villains]);

  const patchVillain = (patch: Partial<Villain>) => {
    const villains = [...hand.villains];
    if (!villains[selectedVillainIndex]) {
      villains[selectedVillainIndex] = {};
    }
    villains[selectedVillainIndex] = {
      ...villains[selectedVillainIndex],
      ...patch,
    };
    onVillainChange(villains);
  };

  const seatOptions =
    villainPositionOptions.length > 0 ? villainPositionOptions : [];

  return (
    <div className="space-y-4 flex-1 animate-fadeIn flex flex-col justify-between">
      <div className="space-y-4">
        <p className="text-xs text-slate-400 text-center">
          Seat and tags for Villain {selectedVillainIndex + 1}.
        </p>

        {hand.preflopAction && (
          <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-900/50 text-center space-y-1">
            <span className="text-[9px] text-sky-400 font-bold uppercase tracking-widest">
              Your preflop line (step 7)
            </span>
            <p className="text-sm font-black text-sky-200">
              {hand.preflopAction}
              {hand.preflopAmount
                ? ` · ${formatPreflopSizing(hand.preflopAmount)}`
                : ""}
            </p>
            {!heroPreflopActsBeforeVillains(hand.preflopAction) && (
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Villains act before you — suggested villain action is pre-selected
                below.
              </p>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Villain Seat Position
            </label>
            {villainPositionHint && (
              <p className="text-[10px] text-emerald-500/90 leading-relaxed">
                {villainPositionHint}
              </p>
            )}
            <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
              {seatOptions.map((pos) => {
                const currentV = hand.villains[selectedVillainIndex] || {};
                const isSelected = currentV.position === pos;
                return (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => {
                      playHaptic("click");
                      patchVillain({ position: pos });
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                      isSelected
                        ? "bg-poker-accent text-slate-950 font-black"
                        : "bg-slate-950 text-slate-400 hover:bg-slate-900"
                    }`}
                  >
                    {pos}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Profile Tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PROFILE_TAGS.map((tag) => {
                const currentV = hand.villains[selectedVillainIndex] || {};
                const isSelected = currentV.tag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      playHaptic("click");
                      patchVillain({ tag });
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-poker-accent/20 text-poker-accent border border-poker-accent/40"
                        : "bg-slate-950 text-slate-500 hover:bg-slate-900 border border-transparent"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Stack depth (optional)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {VILLAIN_STACK_PRESETS.map((bb) => {
                const currentV = hand.villains[selectedVillainIndex] || {};
                const isSelected = currentV.stackBb === bb;
                return (
                  <button
                    key={bb}
                    type="button"
                    onClick={() => {
                      playHaptic("click");
                      setVillainStackCustomOpen(false);
                      patchVillain({ stackBb: bb });
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-poker-primary text-slate-950"
                        : "bg-slate-950 text-slate-400 hover:bg-slate-900 border border-slate-900"
                    }`}
                  >
                    ~${Math.round(bb * bigBlind)}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  playHaptic("click");
                  setVillainStackCustomOpen(true);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  villainStackCustomOpen ||
                  (hand.villains[selectedVillainIndex]?.stackBb != null &&
                    !VILLAIN_STACK_PRESETS.includes(
                      hand.villains[selectedVillainIndex]?.stackBb as (typeof VILLAIN_STACK_PRESETS)[number]
                    ))
                    ? "bg-poker-accent/20 text-poker-accent border border-poker-accent/40"
                    : "bg-slate-950 text-slate-500 hover:bg-slate-900 border border-transparent"
                }`}
              >
                Custom
              </button>
            </div>
            {villainStackCustomOpen && (
              <div className="flex gap-2 pt-1">
                <input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  step={1}
                  placeholder="BB (e.g. 150)"
                  value={(() => {
                    const stackBb = hand.villains[selectedVillainIndex]?.stackBb;
                    if (
                      stackBb == null ||
                      VILLAIN_STACK_PRESETS.includes(
                        stackBb as (typeof VILLAIN_STACK_PRESETS)[number]
                      )
                    ) {
                      return "";
                    }
                    return String(stackBb);
                  })()}
                  onChange={(e) => {
                    const villains = [...hand.villains];
                    if (!villains[selectedVillainIndex]) {
                      villains[selectedVillainIndex] = {};
                    }
                    const raw = e.target.value.trim();
                    if (!raw) {
                      delete villains[selectedVillainIndex].stackBb;
                    } else {
                      const n = Number(raw);
                      if (Number.isFinite(n) && n > 0) {
                        villains[selectedVillainIndex].stackBb = n;
                      }
                    }
                    onVillainChange(villains);
                  }}
                  className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-900 focus:border-poker-primary text-white text-xs focus:outline-none"
                />
                {(() => {
                  const stackBb = hand.villains[selectedVillainIndex]?.stackBb;
                  if (
                    stackBb == null ||
                    VILLAIN_STACK_PRESETS.includes(
                      stackBb as (typeof VILLAIN_STACK_PRESETS)[number]
                    )
                  ) {
                    return null;
                  }
                  return (
                    <span className="self-center text-[10px] text-poker-accent font-extrabold shrink-0">
                      ≈ {formatBbAsDollars(stackBb, bigBlind)}
                    </span>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Villain preflop action
            </label>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Pre-filled from your line when villains act first. Adjust if needed.
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {["Fold", "Call", "Raise", "3-Bet", "All-In"].map((act) => {
                const currentV = hand.villains[selectedVillainIndex] || {};
                const isSelected = currentV.action === act;
                const isSuggested =
                  inferDefaultVillainPreflopAction(hand.preflopAction) === act &&
                  !heroPreflopActsBeforeVillains(hand.preflopAction);
                return (
                  <button
                    key={act}
                    type="button"
                    onClick={() => {
                      playHaptic("click");
                      patchVillain({ action: act });
                    }}
                    className={`py-2 rounded-lg text-[10px] font-bold text-center transition-all ${
                      isSelected
                        ? "bg-poker-accent text-slate-950 font-black ring-2 ring-poker-accent/50"
                        : isSuggested
                          ? "bg-sky-950/50 border border-sky-700/60 text-sky-300"
                          : "bg-slate-950 border border-slate-900 text-slate-400 hover:bg-slate-900"
                    }`}
                  >
                    {act}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Villain Notes
            </label>
            <input
              type="text"
              placeholder="Write optional observations"
              value={(hand.villains[selectedVillainIndex] || {}).note || ""}
              onChange={(e) => patchVillain({ note: e.target.value })}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-900 focus:border-poker-primary text-white text-xs focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="pt-2">
        {selectedVillainIndex < hand.villainCount - 1 ? (
          <button
            type="button"
            onClick={() => {
              playHaptic("click");
              setSelectedVillainIndex(selectedVillainIndex + 1);
            }}
            className="w-full py-3.5 bg-poker-accent text-slate-950 font-black rounded-xl text-xs transition-colors animate-fadeIn"
          >
            Next Villain
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={!isStepComplete(9, hand)}
            className="w-full py-3.5 bg-poker-primary text-slate-950 font-black rounded-xl text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
