"use client";

import { REVIEW_TAG_GROUPS } from "@/lib/constants";
import { playHaptic } from "@/lib/haptics";
import type { Hand } from "@/lib/types";
import { Flag } from "lucide-react";

export type WizardStepOutcomeProps = {
  wizardStep: number;
  hand: Hand;
  onHandChange: (updates: Partial<Hand>) => void;
  onSave: () => void;
  onBack: () => void;
  isEditing?: boolean;
};

export function WizardStepOutcome({
  wizardStep,
  hand,
  onHandChange,
  onSave,
  onBack: _onBack,
  isEditing = false,
}: WizardStepOutcomeProps) {
  if (wizardStep === 19) {
    return (
      <div className="space-y-5 flex-1 flex flex-col justify-center animate-fadeIn">
        <p className="text-xs text-slate-400 text-center">
          Log final performance outcomes.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {(["Won", "Lost", "Split"] as const).map((res) => (
            <button
              key={res}
              type="button"
              onClick={() => {
                playHaptic("click");
                onHandChange({ result: res });
              }}
              className={`p-4 rounded-xl text-xs font-black transition-all ${
                hand.result === res
                  ? res === "Won"
                    ? "bg-poker-primary text-slate-950 glow-green"
                    : res === "Lost"
                      ? "bg-rose-500 text-white"
                      : "bg-poker-accent text-slate-950 glow-gold"
                  : "bg-slate-950 border border-slate-900 text-slate-400 hover:border-slate-800"
              }`}
            >
              {res}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest font-semibold">
            Net Chips Balance ($)
          </label>
          <input
            type="number"
            placeholder="Enter chips amount won or lost"
            value={hand.resultAmount}
            onChange={(e) => onHandChange({ resultAmount: e.target.value })}
            className="w-full p-4 rounded-xl bg-slate-950 border border-slate-900 focus:border-poker-primary text-white font-medium text-sm transition-colors focus:outline-none"
          />
        </div>
      </div>
    );
  }

  if (wizardStep === 20) {
    const reviewWanted = hand.reviewWanted ?? false;

    return (
      <div className="space-y-4 flex-1 animate-fadeIn flex flex-col justify-between">
        <div className="space-y-4">
          <p className="text-xs text-slate-400 text-center">
            Write optional analysis commentary & review tags.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Hand Notes
            </label>
            <textarea
              placeholder="Write detailed observation summaries..."
              rows={4}
              value={hand.notes}
              onChange={(e) => onHandChange({ notes: e.target.value })}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-900 focus:border-poker-primary text-white text-xs focus:outline-none resize-none"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              playHaptic("click");
              onHandChange({ reviewWanted: !hand.reviewWanted });
            }}
            className={`w-full flex items-center justify-center gap-2.5 p-4 rounded-xl font-bold text-sm transition-all ${
              reviewWanted
                ? "bg-poker-accent/15 text-poker-accent border border-poker-accent/50 glow-gold"
                : "bg-slate-950 text-slate-500 border border-slate-900 hover:border-slate-800"
            }`}
          >
            <Flag
              className="w-4 h-4 shrink-0"
              fill={reviewWanted ? "currentColor" : "none"}
            />
            {reviewWanted ? "Review Wanted" : "Mark for Review"}
          </button>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Review Tags
            </label>
            {(
              Object.entries(REVIEW_TAG_GROUPS) as [string, readonly string[]][]
            ).map(([groupLabel, tags]) => (
              <div key={groupLabel} className="space-y-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">
                  {groupLabel}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => {
                    const isSelected = hand.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          playHaptic("click");
                          const activeTags = [...hand.tags];
                          if (isSelected) {
                            onHandChange({
                              tags: activeTags.filter((t) => t !== tag),
                            });
                          } else {
                            activeTags.push(tag);
                            onHandChange({ tags: activeTags });
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? "bg-poker-primary/20 text-poker-primary border border-poker-primary/40"
                            : "bg-slate-950 text-slate-500 hover:bg-slate-900 border border-transparent"
                        }`}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onSave}
          className="w-full py-3.5 bg-poker-primary text-slate-950 font-black rounded-xl text-xs transition-colors glow-green mt-2"
        >
          {isEditing ? "SAVE CHANGES" : "SAVE HAND"}
        </button>
      </div>
    );
  }

  return null;
}
