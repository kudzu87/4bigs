"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { playHaptic } from "@/lib/haptics";
import {
  type BeforeInstallPromptEvent,
  isIosSafari,
  isStandaloneMode,
} from "@/lib/pwa";

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (isStandaloneMode()) return;

    const timer = setTimeout(() => setVisible(true), 3000);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    setIsIos(isIosSafari());

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  if (!visible || isStandaloneMode()) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    playHaptic("click");
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") {
      playHaptic("success");
      setVisible(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-sm mx-auto bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl z-50">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
          <img src="/icons/icon-192.png" alt="" className="w-8 h-8 rounded-lg" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-bold text-sm">Install 4 Bigs</h4>
            <button
              type="button"
              onClick={() => setVisible(false)}
              className="p-1 text-slate-500 hover:text-slate-300"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isIos || !deferredPrompt ? (
            <p className="text-xs text-slate-400 mt-1">
              Tap <Share className="w-3 h-3 inline -mt-0.5" /> Share, then{" "}
              <strong className="text-slate-300">Add to Home Screen</strong> for fullscreen tableside logging.
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-1">
              Install for fullscreen use and faster access — works offline for saved sessions.
            </p>
          )}

          <div className="flex gap-2 mt-3">
            {deferredPrompt ? (
              <button
                type="button"
                onClick={handleInstall}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Install App
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  playHaptic("success");
                  setVisible(false);
                }}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-xs font-bold"
              >
                Got it
              </button>
            )}
            <button
              type="button"
              onClick={() => setVisible(false)}
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
