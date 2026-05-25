"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { playHaptic } from "@/lib/haptics";
import { copyTextToClipboard, formatSessionSummary } from "@/lib/session-summary";
import type { Session } from "@/lib/types";

type CopySessionNotesButtonProps = {
  session: Session;
  variant?: "primary" | "compact";
  className?: string;
};

export function CopySessionNotesButton({
  session,
  variant = "primary",
  className = "",
}: CopySessionNotesButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = formatSessionSummary(session);
    const ok = await copyTextToClipboard(text);
    if (ok) {
      playHaptic("success");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      playHaptic("click");
    }
  };

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleCopy}
        title="Copy session notes"
        className={`p-1.5 rounded-lg border transition-colors ${
          copied
            ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
            : "border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700"
        } ${className}`}
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!session.hands?.length}
      className={`w-full py-3 flex items-center justify-center gap-2 rounded-xl border text-xs font-bold transition-all ${
        copied
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
          : session.hands?.length
            ? "border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-300"
            : "border-slate-900 bg-slate-950/50 text-slate-600 cursor-not-allowed"
      } ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          Copied to clipboard
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          Copy session notes
        </>
      )}
    </button>
  );
}
