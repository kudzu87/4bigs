"use client";

import { Archive, Play, Trash2 } from "lucide-react";
import type { Session } from "@/lib/types";
import { CopySessionNotesButton } from "./CopySessionNotesButton";

type HomeViewProps = {
  pastSessions: Session[];
  onStartClick: () => void;
  onDeleteSession: (id: string) => void;
};

export function HomeView({ pastSessions, onStartClick, onDeleteSession }: HomeViewProps) {
  const totalHands = pastSessions.reduce(
    (acc, s) => acc + (s.hands ? s.hands.length : 0),
    0
  );
  const overallProfit = pastSessions.reduce((acc, s) => acc + (s.netAmount || 0), 0);

  return (
    <div className="px-4 pt-6 space-y-6">
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-[#131926] border border-slate-800/80 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
        <h2 className="text-2xl font-black mb-1">Welcome back, Hero</h2>
        <p className="text-xs text-slate-400">
          Tactical multi-street hand logger to audit and optimize game parameters.
        </p>

        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-800/60">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Aggregate Profit</span>
            <p
              className={`text-xl font-black tracking-tight ${overallProfit >= 0 ? "text-emerald-500" : "text-rose-500"}`}
            >
              {overallProfit >= 0 ? `+$${overallProfit}` : `-$${Math.abs(overallProfit)}`}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Logged Hands</span>
            <p className="text-xl font-black text-slate-200">{totalHands}</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onStartClick}
        className="w-full py-4 bg-emerald-500 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 tap-scale shadow-lg hover:bg-emerald-400 transition-all"
      >
        <Play className="w-5 h-5 fill-current" />
        START NEW SESSION
      </button>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Historical Audit Logs</h3>
          <span className="text-xs text-slate-500 font-medium">{pastSessions.length} logged</span>
        </div>

        {pastSessions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#131926]/30 border border-slate-900/60 text-center space-y-2">
            <Archive className="w-8 h-8 text-slate-700 mx-auto" />
            <p className="text-xs text-slate-500">
              No session history tracked yet. Tap start session above to begin logs.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pastSessions.map((session) => {
              const dateStr = new Date(session.startTime).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              return (
                <div
                  key={session.id}
                  className="p-4 rounded-2xl bg-[#131926] border border-slate-900 hover:border-slate-800 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-white">{session.roomName}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {dateStr} · Stakes: {session.stakes} · {session.tableSize}-Max · Stack:{" "}
                        {session.startingStack}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                          session.netAmount >= 0
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {session.netAmount >= 0
                          ? `+$${session.netAmount}`
                          : `-$${Math.abs(session.netAmount)}`}
                      </span>
                      <CopySessionNotesButton session={session} variant="compact" />
                      <button
                        type="button"
                        onClick={() => onDeleteSession(session.id)}
                        className="p-1 hover:text-rose-500 text-slate-600 transition-colors"
                        title="Delete session log"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {session.hands && session.hands.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/40">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 font-semibold">
                        Latest Hand
                      </p>
                      <div className="flex items-center justify-between bg-slate-950/40 p-2 rounded-xl border border-slate-900/60 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-bold">
                            {session.hands[0].heroPosition}{" "}
                            {session.hands[0].effectiveStack
                              ? `(${session.hands[0].effectiveStack})`
                              : ""}
                          </span>
                          <div className="flex gap-0.5 text-[10px]">
                            <span className="bg-slate-800 text-white px-1.5 py-0.5 rounded font-mono font-bold">
                              {session.hands[0].heroCards[0].rank}
                              {session.hands[0].heroCards[0].suit}
                            </span>
                            <span className="bg-slate-800 text-white px-1.5 py-0.5 rounded font-mono font-bold">
                              {session.hands[0].heroCards[1].rank}
                              {session.hands[0].heroCards[1].suit}
                            </span>
                          </div>
                        </div>
                        <span
                          className={
                            session.hands[0].result === "Won"
                              ? "text-emerald-500 font-bold"
                              : session.hands[0].result === "Lost"
                                ? "text-rose-500"
                                : "text-slate-400"
                          }
                        >
                          {session.hands[0].result} (${session.hands[0].resultAmount || "0"})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
