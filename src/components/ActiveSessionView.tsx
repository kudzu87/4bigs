"use client";

import { PlusCircle, ShieldAlert } from "lucide-react";
import type { Session } from "@/lib/types";

type ActiveSessionViewProps = {
  session: Session;
  onAddHand: () => void;
  onEndClick: () => void;
};

export function ActiveSessionView({ session, onAddHand, onEndClick }: ActiveSessionViewProps) {
  return (
    <div className="px-4 pt-4 space-y-5">
      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-[#131926] border border-slate-800 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">
              Active Studio Session
            </span>
            <h3 className="font-black text-white text-base leading-tight">{session.roomName}</h3>
          </div>
          <button
            type="button"
            onClick={onEndClick}
            className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 text-xs font-black rounded-lg transition-all"
          >
            End Session
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-slate-800/60 text-center">
          <div className="bg-slate-950/40 p-2 rounded-xl">
            <span className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold">Stakes</span>
            <p className="text-xs font-extrabold text-slate-300 mt-0.5">{session.stakes}</p>
          </div>
          <div className="bg-slate-950/40 p-2 rounded-xl">
            <span className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold">Seats</span>
            <p className="text-xs font-extrabold text-slate-300 mt-0.5">{session.tableSize}-Max</p>
          </div>
          <div className="bg-slate-950/40 p-2 rounded-xl">
            <span className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold">Start Stack</span>
            <p className="text-xs font-extrabold text-slate-300 mt-0.5 truncate">{session.startingStack}</p>
          </div>
          <div className="bg-slate-950/40 p-2 rounded-xl">
            <span className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold">Net P&L</span>
            <p
              className={`text-xs font-extrabold mt-0.5 ${session.netAmount >= 0 ? "text-emerald-500" : "text-rose-500"}`}
            >
              {session.netAmount >= 0 ? `+$${session.netAmount}` : `-$${Math.abs(session.netAmount)}`}
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onAddHand}
        className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 tap-scale shadow-lg glow-green transition-all"
      >
        <PlusCircle className="w-5 h-5" />
        ADD HAND TO TRACKER
      </button>

      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Session Hand Ledger</h4>

        {session.hands.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#131926]/30 border border-slate-900/60 text-center space-y-2">
            <ShieldAlert className="w-8 h-8 text-slate-700 mx-auto" />
            <p className="text-xs text-slate-500">
              No hands recorded yet. Tap &quot;Add Hand to Tracker&quot; to begin audit.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {session.hands.map((hand, index) => (
              <div
                key={hand.id}
                className="p-4 rounded-xl bg-[#131926] border border-slate-900 hover:border-slate-800 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center font-bold text-xs text-slate-500">
                      #{session.hands.length - index}
                    </span>
                    <span className="font-bold text-sm text-slate-200">
                      Position: {hand.heroPosition}{" "}
                      {hand.effectiveStack ? `(${hand.effectiveStack})` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-black uppercase ${
                        hand.result === "Won"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : hand.result === "Lost"
                            ? "bg-rose-500/10 text-rose-400"
                            : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {hand.result}
                    </span>
                    <span className="font-extrabold text-sm text-slate-300">
                      {hand.resultAmount ? `$${hand.resultAmount}` : "$0"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-y border-slate-800/40 text-xs">
                  <div className="flex gap-1">
                    {hand.heroCards.map((card, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono font-bold text-slate-100"
                      >
                        {card.rank}
                        {card.suit}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    {hand.boardFlop && hand.boardFlop[0]?.rank ? (
                      <span className="font-mono text-slate-300">
                        [ {hand.boardFlop[0].rank}
                        {hand.boardFlop[0].suit} {hand.boardFlop[1].rank}
                        {hand.boardFlop[1].suit} {hand.boardFlop[2].rank}
                        {hand.boardFlop[2].suit}
                        {hand.boardTurn?.rank && ` · ${hand.boardTurn.rank}${hand.boardTurn.suit}`}
                        {hand.boardRiver?.rank && ` · ${hand.boardRiver.rank}${hand.boardRiver.suit}`} ]
                      </span>
                    ) : (
                      <span className="italic text-slate-600">Ended Preflop</span>
                    )}
                  </div>
                </div>

                {(hand.flopActions?.length > 0 ||
                  hand.turnActions?.length > 0 ||
                  hand.riverActions?.length > 0) && (
                  <div className="bg-slate-950/50 p-2.5 rounded-lg text-[10px] space-y-1 border border-slate-900 max-h-32 overflow-y-auto font-mono">
                    <p className="text-[9px] text-slate-500 font-bold tracking-wider uppercase">
                      Live Postflop Actions
                    </p>
                    {hand.flopActions?.map((act, i) => (
                      <div key={`f-${i}`} className="text-slate-300 flex items-center gap-1">
                        <span className="text-emerald-500">Flop:</span> {act}
                      </div>
                    ))}
                    {hand.turnActions?.map((act, i) => (
                      <div key={`t-${i}`} className="text-slate-300 flex items-center gap-1">
                        <span className="text-amber-500">Turn:</span> {act}
                      </div>
                    ))}
                    {hand.riverActions?.map((act, i) => (
                      <div key={`r-${i}`} className="text-slate-300 flex items-center gap-1">
                        <span className="text-rose-400">River:</span> {act}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                  <div className="flex flex-wrap gap-1">
                    {hand.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-slate-400 font-semibold"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                  <p className="text-slate-500 italic truncate max-w-[200px]">
                    {hand.notes || "No review notes written."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
