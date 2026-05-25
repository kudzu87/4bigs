"use client";

import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { STAKES, TABLE_SIZES } from "@/lib/constants";
import { playHaptic } from "@/lib/haptics";
import type { SessionSetup } from "@/lib/types";

type StartSessionViewProps = {
  onStart: (setup: SessionSetup) => void;
  onCancel: () => void;
};

const STACK_PRESETS = ["100 BB", "150 BB", "200 BB", "Other"] as const;

export function StartSessionView({ onStart, onCancel }: StartSessionViewProps) {
  const [stakes, setStakes] = useState("1/2");
  const [tableSize, setTableSize] = useState(9);
  const [startingStack, setStartingStack] = useState("100 BB");
  const [roomName, setRoomName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart({
      stakes,
      tableSize,
      startingStack,
      roomName: roomName || "Casino Arena",
    });
  };

  return (
    <div className="px-4 pt-6 space-y-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="p-2 hover:bg-slate-900 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-black">Configure Session Settings</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-[#131926] p-5 rounded-3xl border border-slate-900">
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Select Game Stakes
          </label>
          <div className="grid grid-cols-4 gap-2">
            {STAKES.map((stake) => (
              <button
                key={stake}
                type="button"
                onClick={() => {
                  playHaptic("click");
                  setStakes(stake);
                }}
                className={`py-3 rounded-xl font-bold text-sm transition-all ${
                  stakes === stake
                    ? "bg-emerald-500 text-slate-950 glow-green"
                    : "bg-slate-950 border border-slate-900 text-slate-400 hover:border-slate-800"
                }`}
              >
                {stake}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Table Size (Max Seats)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {TABLE_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  playHaptic("click");
                  setTableSize(size);
                }}
                className={`py-3 rounded-xl font-extrabold text-sm transition-all ${
                  tableSize === size
                    ? "bg-emerald-500 text-slate-950 glow-green"
                    : "bg-slate-950 border border-slate-900 text-slate-400 hover:border-slate-800"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Starting Stack Size
          </label>
          <div className="grid grid-cols-4 gap-2">
            {STACK_PRESETS.map((stack) => (
              <button
                key={stack}
                type="button"
                onClick={() => {
                  playHaptic("click");
                  setStartingStack(stack);
                }}
                className={`py-3 rounded-xl font-bold text-xs transition-all ${
                  startingStack === stack ||
                  (stack === "Other" && !["100 BB", "150 BB", "200 BB"].includes(startingStack))
                    ? "bg-emerald-500 text-slate-950 glow-green"
                    : "bg-slate-950 border border-slate-900 text-slate-400 hover:border-slate-800"
                }`}
              >
                {stack}
              </button>
            ))}
          </div>
          {(!["100 BB", "150 BB", "200 BB"].includes(startingStack) || startingStack === "Other") && (
            <input
              type="text"
              placeholder="e.g. 300 BB"
              value={startingStack === "Other" ? "" : startingStack}
              onChange={(e) => setStartingStack(e.target.value)}
              className="w-full mt-2 p-3 rounded-xl bg-slate-950 border border-slate-900 focus:border-emerald-500 text-white text-xs focus:outline-none"
            />
          )}
        </div>

        <div className="space-y-2.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Poker Club or Casino Name
          </label>
          <input
            type="text"
            placeholder="e.g. Playground Poker, Bellagio"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="w-full p-4 rounded-xl bg-slate-950 border border-slate-900 focus:border-emerald-500 text-white font-medium text-sm transition-colors focus:outline-none"
          />
        </div>

        <div className="pt-4 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3.5 bg-slate-950 border border-slate-900 hover:border-slate-800 rounded-xl font-bold text-xs text-slate-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 py-3.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs transition-colors"
          >
            START SESSION
          </button>
        </div>
      </form>
    </div>
  );
}
