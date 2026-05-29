"use client";

import type { ReactNode } from "react";
import { RANKS, SUITS } from "@/lib/constants";
import { cardKey } from "@/lib/cards";

export type WizardCardInputProps = {
  label: string;
  card: { rank: string; suit: string };
  usedCards: string[];
  onCardChange: (key: "rank" | "suit", value: string) => void;
  getSuitColor: (suit: string) => string;
  /** Replaces the default single-card preview (e.g. hero card 2 with card 1 mini). */
  preview?: ReactNode;
};

function isRankDisabled(
  rank: string,
  card: { rank: string; suit: string },
  usedCards: string[]
): boolean {
  if (!card.suit) return false;
  return usedCards.includes(cardKey(rank, card.suit));
}

function isSuitDisabled(
  suit: string,
  card: { rank: string; suit: string },
  usedCards: string[]
): boolean {
  if (!card.rank) return false;
  return usedCards.includes(cardKey(card.rank, suit));
}

export function CardFacePreview({
  card,
  getSuitColor,
  size = "large",
  dimmed = false,
}: {
  card: { rank: string; suit: string };
  getSuitColor: (suit: string) => string;
  size?: "large" | "small";
  dimmed?: boolean;
}) {
  if (size === "small") {
    return (
      <div
        className={`h-16 w-11 rounded-lg border border-slate-800 bg-poker-card/60 flex flex-col justify-between p-1 ${
          dimmed ? "opacity-60" : ""
        }`}
      >
        <span className="text-xs font-bold text-slate-400 leading-none">{card.rank}</span>
        <span className={`text-base self-end ${getSuitColor(card.suit)}`}>{card.suit}</span>
      </div>
    );
  }

  return (
    <div className="h-24 w-16 mx-auto rounded-xl border border-slate-800 bg-poker-card flex flex-col justify-between p-2 shadow-lg relative animate-bounce">
      {card.rank ? (
        <>
          <span className="text-base font-black tracking-tight leading-none text-slate-100">
            {card.rank}
          </span>
          <span
            className={`text-2xl text-center leading-none self-end ${getSuitColor(card.suit)}`}
          >
            {card.suit}
          </span>
        </>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-slate-700 font-mono text-lg font-bold">
          ?
        </span>
      )}
    </div>
  );
}

export function WizardCardInput({
  label,
  card,
  usedCards,
  onCardChange,
  getSuitColor,
  preview,
}: WizardCardInputProps) {
  return (
    <div className="space-y-4 flex-1 animate-fadeIn">
      <p className="text-xs text-slate-400 text-center">{label}</p>

      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-900 space-y-3">
        {preview ?? <CardFacePreview card={card} getSuitColor={getSuitColor} />}

        <div className="space-y-1">
          <span className="text-[8px] text-slate-600 font-bold uppercase">Rank</span>
          <div className="flex gap-1 overflow-x-auto pb-1 max-w-full">
            {RANKS.map((r) => {
              const disabled = isRankDisabled(r, card, usedCards);
              const selected = card.rank === r;
              return (
                <button
                  key={r}
                  type="button"
                  disabled={disabled}
                  onClick={() => onCardChange("rank", r)}
                  className={`px-2.5 py-1.5 rounded text-xs font-bold font-mono shrink-0 transition-all ${
                    disabled
                      ? "opacity-25 cursor-not-allowed bg-slate-950 text-slate-600"
                      : selected
                        ? "bg-poker-primary text-slate-950"
                        : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[8px] text-slate-600 font-bold uppercase">Suit</span>
          <div className="grid grid-cols-4 gap-2">
            {SUITS.map((s) => {
              const disabled = isSuitDisabled(s.symbol, card, usedCards);
              const selected = card.suit === s.symbol;
              return (
                <button
                  key={s.symbol}
                  type="button"
                  disabled={disabled}
                  onClick={() => onCardChange("suit", s.symbol)}
                  className={`p-2.5 rounded-xl border text-sm text-center transition-all ${
                    disabled
                      ? "opacity-25 cursor-not-allowed bg-slate-950 border-slate-900 text-slate-600"
                      : selected
                        ? `${s.bg} border-2`
                        : "bg-slate-900 border-slate-900 text-slate-400"
                  }`}
                >
                  <span className={s.color}>
                    {s.symbol} {s.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
