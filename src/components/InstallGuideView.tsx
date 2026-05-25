"use client";

import { ArrowLeft, Download, Home, Monitor, Share, Smartphone, WifiOff } from "lucide-react";
import { playHaptic } from "@/lib/haptics";
import {
  getInstallGuideTitle,
  getInstallPlatformLabel,
  type InstallPlatform,
} from "@/lib/pwa";

type InstallGuideViewProps = {
  platform: InstallPlatform;
  canNativeInstall: boolean;
  onContinue: () => void | Promise<void>;
  onBack: () => void;
};

function BenefitList({ isDesktop }: { isDesktop: boolean }) {
  return (
    <ul className="space-y-2 text-xs text-slate-300">
      <li className="flex items-start gap-2">
        <Home className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <span>
          {isDesktop
            ? "Launch from your desktop or taskbar like a normal app"
            : "One tap from your home screen to start logging"}
        </span>
      </li>
      <li className="flex items-start gap-2">
        {isDesktop ? (
          <Monitor className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        ) : (
          <Smartphone className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        )}
        <span>
          {isDesktop
            ? "Dedicated window without browser tabs getting in the way"
            : "Full screen — no browser bars in the way"}
        </span>
      </li>
      <li className="flex items-start gap-2">
        <WifiOff className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <span>Hands you save stay on this device, even with spotty signal</span>
      </li>
    </ul>
  );
}

function Step({
  number,
  children,
}: {
  number: number;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="w-6 h-6 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-xs font-black text-emerald-500 shrink-0">
        {number}
      </span>
      <span>{children}</span>
    </li>
  );
}

function IosSafariSteps() {
  return (
    <ol className="space-y-4 text-sm text-slate-300">
      <Step number={1}>
        Open this site in <strong className="text-white">Safari</strong> (install steps differ in Chrome on iPhone).
      </Step>
      <Step number={2}>
        <span className="flex items-center gap-1 flex-wrap">
          Tap <Share className="w-4 h-4 text-sky-400" /> <strong className="text-white">Share</strong> at the bottom of the screen.
        </span>
      </Step>
      <Step number={3}>
        Scroll and tap <strong className="text-white">Add to Home Screen</strong>.
      </Step>
      <Step number={4}>
        Tap <strong className="text-white">Add</strong>, then open 4 Bigs from your home screen.
      </Step>
    </ol>
  );
}

function IosOtherSteps() {
  return (
    <ol className="space-y-4 text-sm text-slate-300">
      <Step number={1}>
        For the smoothest install, open <strong className="text-white">4bigs.vercel.app</strong> in <strong className="text-white">Safari</strong>.
      </Step>
      <Step number={2}>
        In Safari, use <strong className="text-white">Share → Add to Home Screen</strong>.
      </Step>
    </ol>
  );
}

function AndroidSteps({ canNativeInstall }: { canNativeInstall: boolean }) {
  return (
    <ol className="space-y-4 text-sm text-slate-300">
      {canNativeInstall ? (
        <Step number={1}>
          Tap <strong className="text-white">Continue</strong> below. Your phone should show an install prompt — accept it to add 4 Bigs.
        </Step>
      ) : (
        <Step number={1}>
          In <strong className="text-white">Chrome</strong>, tap the <strong className="text-white">menu (⋮)</strong>, then choose{" "}
          <strong className="text-white">Install app</strong> or <strong className="text-white">Add to Home screen</strong>.
        </Step>
      )}
      <Step number={2}>
        Confirm the install, then launch 4 Bigs from your home screen or app drawer.
      </Step>
    </ol>
  );
}

function DesktopChromiumSteps({ canNativeInstall }: { canNativeInstall: boolean }) {
  const isEdge = typeof navigator !== "undefined" && /Edg\//i.test(navigator.userAgent);

  return (
    <ol className="space-y-4 text-sm text-slate-300">
      {canNativeInstall ? (
        <Step number={1}>
          Tap <strong className="text-white">Continue</strong> below. {isEdge ? "Edge" : "Chrome"} will show an install dialog — click{" "}
          <strong className="text-white">Install</strong> to add 4 Bigs.
        </Step>
      ) : (
        <Step number={1}>
          Look for an <strong className="text-white">install icon</strong> in the address bar (often a monitor with an arrow), or open the browser{" "}
          <strong className="text-white">menu</strong> and choose <strong className="text-white">Install 4 Bigs</strong> /{" "}
          <strong className="text-white">Apps → Install this site</strong>.
        </Step>
      )}
      <Step number={2}>
        After installing, open 4 Bigs from your desktop, Start menu, or taskbar — it runs in its own window.
      </Step>
    </ol>
  );
}

function DesktopOtherSteps() {
  return (
    <ol className="space-y-4 text-sm text-slate-300">
      <Step number={1}>
        Use <strong className="text-white">Chrome</strong> or <strong className="text-white">Microsoft Edge</strong> for the easiest install on a computer.
      </Step>
      <Step number={2}>
        In the browser menu, look for <strong className="text-white">Install</strong>, <strong className="text-white">Install app</strong>, or{" "}
        <strong className="text-white">Save and share → Install</strong>.
      </Step>
    </ol>
  );
}

function PlatformSteps({
  platform,
  canNativeInstall,
}: {
  platform: InstallPlatform;
  canNativeInstall: boolean;
}) {
  switch (platform) {
    case "ios-safari":
      return <IosSafariSteps />;
    case "ios-other":
      return <IosOtherSteps />;
    case "android":
      return <AndroidSteps canNativeInstall={canNativeInstall} />;
    case "desktop-chromium":
      return <DesktopChromiumSteps canNativeInstall={canNativeInstall} />;
    case "desktop-other":
      return <DesktopOtherSteps />;
    default:
      return (
        <ol className="space-y-4 text-sm text-slate-300">
          <Step number={1}>
            Use Chrome, Edge, or Safari and look for an install option in the browser menu or address bar.
          </Step>
        </ol>
      );
  }
}

function footerNote(platform: InstallPlatform, canNativeInstall: boolean): string {
  switch (platform) {
    case "ios-safari":
      return "After you add the icon, use the home screen shortcut for the best tableside experience.";
    case "ios-other":
      return "Safari is recommended on iPhone for Add to Home Screen.";
    case "android":
      return canNativeInstall
        ? "If you dismiss the prompt, try Chrome’s menu → Install app."
        : "Samsung Internet and Firefox may use different menu labels.";
    case "desktop-chromium":
      return canNativeInstall
        ? "You can also install later from the ⊕ icon in the address bar."
        : "If you don’t see Install, try Chrome or Edge — other browsers may not support app install.";
    case "desktop-other":
      return "Firefox and Safari on desktop have limited PWA install support compared to Chrome or Edge.";
    default:
      return "";
  }
}

export function InstallGuideView({
  platform,
  canNativeInstall,
  onContinue,
  onBack,
}: InstallGuideViewProps) {
  const isDesktop =
    platform === "desktop-chromium" || platform === "desktop-other";

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
        <h2 className="text-xl font-black">{getInstallGuideTitle(platform)}</h2>
      </div>

      <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-[#131926] border border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <img src="/icons/icon-192.png" alt="" className="w-11 h-11 rounded-xl" />
          </div>
          <div>
            <h3 className="font-black text-lg text-white">Use 4 Bigs like a regular app</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {isDesktop
                ? "No download store required. Install once and open from your desktop."
                : "No App Store needed. Add a home screen icon that opens full screen at the table."}
            </p>
          </div>
        </div>
        <BenefitList isDesktop={isDesktop} />
      </div>

      <div className="bg-[#131926] p-5 rounded-3xl border border-slate-900 space-y-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {getInstallPlatformLabel(platform)}
        </h4>
        <PlatformSteps platform={platform} canNativeInstall={canNativeInstall} />
      </div>

      <p className="text-[11px] text-slate-500 text-center px-2 leading-relaxed">
        {footerNote(platform, canNativeInstall)}
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
          className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
        >
          {canNativeInstall && (
            <Download className="w-3.5 h-3.5" />
          )}
          Continue
        </button>
      </div>
    </div>
  );
}
