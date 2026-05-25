"use client";

import { useCallback, useEffect, useState } from "react";
import { playHaptic } from "@/lib/haptics";
import {
  type BeforeInstallPromptEvent,
  detectInstallPlatform,
  type InstallPlatform,
  isStandaloneMode,
} from "@/lib/pwa";

export function usePwaInstall() {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<InstallPlatform>("unknown");
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (isStandaloneMode()) {
      setIsInstalled(true);
      return;
    }

    setPlatform(detectInstallPlatform());

    const timer = setTimeout(() => setShowBanner(true), 3000);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  const dismissBanner = useCallback(() => setShowBanner(false), []);

  const triggerNativeInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    playHaptic("click");
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") {
      playHaptic("success");
      setIsInstalled(true);
      setShowBanner(false);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  return {
    showBanner,
    dismissBanner,
    platform,
    /** @deprecated prefer platform */
    isIos: platform === "ios-safari" || platform === "ios-other",
    isInstalled,
    canNativeInstall: !!deferredPrompt,
    triggerNativeInstall,
  };
}
