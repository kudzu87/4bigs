import fs from "fs";

const html = fs.readFileSync("legacy/index.html", "utf8");
const start = html.indexOf("function HandWizard(");
const end = html.indexOf("function PostflopLiveActionLogger(");
let body = html.slice(start, end);

body = body.replace(/^function HandWizard\(/, "export function HandWizard(");
body = body.replace(
  /useEffect\(\(\) => \{\s*if \(window\.lucide\) \{\s*window\.lucide\.createIcons\(\);\s*\}\s*\}, \[[^\]]*\]\);/g,
  ""
);

const header = `"use client";

import { useState } from "react";
import { ChevronLeft, XCircle } from "lucide-react";
import {
  ACTIONS,
  PROFILE_TAGS,
  RANKS,
  REVIEW_TAGS,
  SUITS,
} from "@/lib/constants";
import { playHaptic } from "@/lib/haptics";
import { getPostflopWeight } from "@/lib/positions";
import type { Hand, StreetState } from "@/lib/types";
import { PostflopLiveActionLogger } from "./PostflopLiveActionLogger";

export type HandWizardProps = {
  initialHand: Hand;
  tableSize: number;
  getPositionsForSize: (size: number) => string[];
  wizardStep: number;
  setWizardStep: React.Dispatch<React.SetStateAction<number>>;
  selectedVillainIndex: number;
  setSelectedVillainIndex: React.Dispatch<React.SetStateAction<number>>;
  onSave: (hand: Hand) => void;
  onCancel: () => void;
};

`;

fs.writeFileSync("src/components/HandWizard.tsx", header + body);
console.log("HandWizard.tsx written");

const pfStart = html.indexOf("function PostflopLiveActionLogger(");
const pfEnd = html.indexOf("const root = ReactDOM.createRoot");
let pfBody = html.slice(pfStart, pfEnd);
pfBody = pfBody.replace(
  /^function PostflopLiveActionLogger\(/,
  "export function PostflopLiveActionLogger("
);

const pfHeader = `"use client";

import { playHaptic } from "@/lib/haptics";
import type { Hand, StreetState } from "@/lib/types";

export type PostflopLiveActionLoggerProps = {
  streetState: StreetState;
  setStreetState: React.Dispatch<React.SetStateAction<StreetState>>;
  handlePlayerAction: (actionType: string, sizing?: string) => void;
  skipToOutcome: () => void;
  getSuitColor: (suit: string) => string;
  hand: Hand;
};

`;

fs.writeFileSync("src/components/PostflopLiveActionLogger.tsx", pfHeader + pfBody);
console.log("PostflopLiveActionLogger.tsx written");
