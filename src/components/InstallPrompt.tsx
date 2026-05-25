"use client";

import { X } from "lucide-react";
import { playHaptic } from "@/lib/haptics";

type InstallPromptProps = {
  visible: boolean;
  onInstallClick: () => void;
  onDismiss: () => void;
};

export function InstallPrompt({ visible, onInstallClick, onDismiss }: InstallPromptProps) {
  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-sm mx-auto bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl z-50">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
          <img src="/icons/icon-192.png" alt="" className="w-8 h-8 rounded-lg" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-bold text-sm">Use 4 Bigs on your phone</h4>
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 text-slate-500 hover:text-slate-300"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Add a home screen icon for full-screen logging at the table — we&apos;ll walk you through it.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => {
                playHaptic("click");
                onInstallClick();
              }}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-xs font-bold"
            >
              Install App
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
