export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallPlatform =
  | "ios-safari"
  | "ios-other"
  | "android"
  | "desktop-chromium"
  | "desktop-other"
  | "unknown";

export function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function isDesktopDevice(): boolean {
  if (typeof window === "undefined") return false;
  return !isIosDevice() && !isAndroidDevice();
}

export function detectInstallPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "unknown";

  const ua = navigator.userAgent;

  if (isIosDevice()) {
    const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/i.test(ua);
    return isSafari ? "ios-safari" : "ios-other";
  }

  if (isAndroidDevice()) {
    return "android";
  }

  if (isDesktopDevice()) {
    if (/Edg\//i.test(ua) || /Chrome/i.test(ua)) {
      return "desktop-chromium";
    }
    return "desktop-other";
  }

  return "unknown";
}

/** @deprecated Use detectInstallPlatform() === "ios-safari" */
export function isIosSafari(): boolean {
  return detectInstallPlatform() === "ios-safari";
}

export function getInstallGuideTitle(platform: InstallPlatform): string {
  switch (platform) {
    case "ios-safari":
    case "ios-other":
    case "android":
      return "Add to your phone";
    case "desktop-chromium":
    case "desktop-other":
      return "Install on this computer";
    default:
      return "Install 4 Bigs";
  }
}

export function getInstallPlatformLabel(platform: InstallPlatform): string {
  switch (platform) {
    case "ios-safari":
      return "On iPhone (Safari)";
    case "ios-other":
      return "On iPhone";
    case "android":
      return "On Android";
    case "desktop-chromium":
      if (/Edg\//i.test(navigator.userAgent)) return "On Windows / Mac (Microsoft Edge)";
      return "On Windows / Mac (Google Chrome)";
    case "desktop-other":
      return "On your computer";
    default:
      return "Install steps";
  }
}
