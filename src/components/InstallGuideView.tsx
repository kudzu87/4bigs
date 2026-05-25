"use client";

import { ArrowLeft, Home, Share, Smartphone, WifiOff } from "lucide-react";
import { playHaptic } from "@/lib/haptics";

type InstallGuideViewProps = {
  isIos: boolean;
  canNativeInstall: boolean;
  onContinue: () => void | Promise<void>;
  onBack: () => void;
};

export function InstallGuideView({
  isIos,
  canNativeInstall,
  onContinue,
  onBack,
}: InstallGuideViewProps) {
  const handleContinue = async () => {
    playHaptic("click");
    await onContinue();
  };

  return (
    <div className="px-4 pt-4 pb-8 space-y-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            playHaptic("click");
            onBack();
          }}
          className="p-2 hover:bg-slate-900 rounded-xl transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-black">Add to your phone</h2>
      </div>

      <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-[#131926] border border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <img src="/icons/icon-192.png" alt="" className="w-11 h-11 rounded-xl" />
          </div>
          <div>
            <h3 className="font-black text-lg text-white">Use 4 Bigs like a regular app</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              No App Store needed. You add a home screen icon that opens full screen at the table.
            </p>
          </div>
        </div>

        <ul className="space-y-2 text-xs text-slate-300">
          <li className="flex items-start gap-2">
            <Home className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>One tap from your home screen to start logging</span>
          </li>
          <li className="flex items-start gap-2">
            <Smartphone className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>Full screen — no browser bars in the way</span>
          </li>
          <li className="flex items-start gap-2">
            <WifiOff className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>Hands you save stay on this phone, even with spotty signal</span>
          </li>
        </ul>
      </div>

      <div className="bg-[#131926] p-5 rounded-3xl border border-slate-900 space-y-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {isIos ? "On iPhone (Safari)" : "On Android (Chrome)"}
        </h4>

        {isIos ? (
          <ol className="space-y-4 text-sm text-slate-300">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-xs font-black text-emerald-500 shrink-0">
                1
              </span>
              <span>
                Open this site in <strong className="text-white">Safari</strong> (the steps do not work the same in Chrome on iPhone).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-xs font-black text-emerald-500 shrink-0">
                2
              </span>
              <span className="flex items-center gap-1 flex-wrap">
                Tap the <Share className="w-4 h-4 text-sky-400" /> <strong className="text-white">Share</strong> button at the bottom of the screen.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-xs font-black text-emerald-500 shrink-0">
                3
              </span>
              <span>
                Scroll the menu and tap <strong className="text-white">Add to Home Screen</strong>.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-xs font-black text-emerald-500 shrink-0">
                4
              </span>
              <span>
                Tap <strong className="text-white">Add</strong>, then open 4 Bigs from your home screen like any other app.
              </span>
            </li>
          </ol>
        ) : (
          <ol className="space-y-4 text-sm text-slate-300">
            {canNativeInstall ? (
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-xs font-black text-emerald-500 shrink-0">
                  1
                </span>
                <span>
                  Tap <strong className="text-white">Continue</strong> below. Your phone will show an install prompt — accept it to add 4 Bigs.
                </span>
              </li>
            ) : (
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-xs font-black text-emerald-500 shrink-0">
                  1
                </span>
                <span>
                  Tap the <strong className="text-white">menu (⋮)</strong> in Chrome, then choose <strong className="text-white">Install app</strong> or <strong className="text-white">Add to Home screen</strong>.
                </span>
              </li>
            )}
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-xs font-black text-emerald-500 shrink-0">
                2
              </span>
              <span>
                Confirm the install, then launch 4 Bigs from your home screen or app drawer.
              </span>
            </li>
          </ol>
        )}
      </div>

      <p className="text-[11px] text-slate-500 text-center px-2 leading-relaxed">
        {isIos
          ? "After you add the icon, come back here anytime in Safari — or use the home screen icon for the best experience."
          : canNativeInstall
            ? "If you dismiss the install prompt, you can still add 4 Bigs from Chrome’s menu."
            : "Some phones show the install option in Chrome’s menu instead of a popup."}
      </p>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            playHaptic("click");
            onBack();
          }}
          className="flex-1 py-3.5 bg-slate-950 border border-slate-900 hover:border-slate-800 rounded-xl font-bold text-xs text-slate-400"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
