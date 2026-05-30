import { formatPreflopSizing } from "./constants";
import {
  getStreetStartPotBb,
  resolveContributionBbForAction,
} from "./betting-round";
import { getHandNetChange, normalizeSession } from "./session-math";
import type { Card, Hand, PotByStreet, Session, Villain } from "./types";

const MONEY_ACTIONS = new Set(["Limp", "Call", "Bet", "Raise"]);

function formatCard(card: Card): string {
  if (!card?.rank) return "";
  return `${card.rank}${card.suit}`;
}

function formatHeroCards(hand: Hand): string {
  const cards = hand.heroCards.map(formatCard).filter(Boolean);
  return cards.length ? cards.join(" ") : "—";
}

function formatBoard(hand: Hand): string | null {
  const flop = hand.boardFlop?.map(formatCard).filter(Boolean) ?? [];
  if (flop.length === 0) return null;

  const parts = [flop.join(" ")];
  const turn = formatCard(hand.boardTurn);
  const river = formatCard(hand.boardRiver);
  if (turn) parts.push(turn);
  if (river) parts.push(river);
  return parts.join(" · ");
}

function bbToDollars(bb: number, bigBlind: number): string {
  const amount = Math.round(bb * bigBlind * 100) / 100;
  return `$${amount}`;
}

function formatSizingBracket(sizing: string, street: keyof PotByStreet): string {
  if (!sizing) return "";
  if (street === "preflop") {
    const formatted = formatPreflopSizing(sizing);
    return formatted ? ` [${formatted}]` : ` [${sizing}]`;
  }
  return ` [${sizing}]`;
}

type ParsedAction = {
  label: string;
  action: string;
  sizing?: string;
};

function parseLiveActionLine(line: string): ParsedAction | null {
  const match = line.match(/^(Hero|Villain \d+) \([^)]+\) (\S+)(?: \[(.+)\])?$/);
  if (!match) return null;
  return {
    label: match[1],
    action: match[2],
    sizing: match[3],
  };
}

export function formatStreetActionLines(
  street: keyof PotByStreet,
  actions: string[] | undefined,
  potByStreet: PotByStreet,
  bigBlind: number
): string[] {
  if (!actions?.length) return [];

  let potBb = getStreetStartPotBb(street, potByStreet);
  const lines: string[] = [formatStreetPotHeader(street, potByStreet, bigBlind)];

  const contributions: Record<string, number> = {};
  let highestBetBb = 0;

  for (const raw of actions) {
    const parsed = parseLiveActionLine(raw);
    if (!parsed) {
      lines.push(`  • ${raw}`);
      continue;
    }

    const potAtActionStart = potBb;
    const before = contributions[parsed.label] ?? 0;
    const sizing = parsed.sizing ?? "";

    const isAllIn =
      parsed.action === "All-In" || sizing === "all-in";
    const displayAction = isAllIn ? "All-In" : parsed.action;

    let dollarSuffix = "";
    if (!isAllIn && MONEY_ACTIONS.has(parsed.action)) {
      const target = resolveContributionBbForAction(
        street,
        parsed.action,
        sizing,
        potAtActionStart,
        highestBetBb
      );
      if (target != null) {
        const increment = Math.max(0, target - before);
        if (increment > 0) {
          potBb += increment;
          dollarSuffix = ` — ${bbToDollars(increment, bigBlind)}`;
        }
        contributions[parsed.label] = target;
        highestBetBb = Math.max(highestBetBb, target);
      }
    }

    const sizingPart =
      !isAllIn && sizing ? formatSizingBracket(sizing, street) : "";
    lines.push(
      `  • ${parsed.label} ${displayAction}${sizingPart}${dollarSuffix}`
    );
  }

  return lines;
}

function capitalizeStreet(street: keyof PotByStreet): string {
  return street.charAt(0).toUpperCase() + street.slice(1);
}

/** Street header line for export (pot at start of street betting, in dollars). */
export function formatStreetPotHeader(
  street: keyof PotByStreet,
  potByStreet: PotByStreet = {},
  bigBlind: number
): string {
  const potBb = getStreetStartPotBb(street, potByStreet);
  return `${capitalizeStreet(street)}: (pot ${bbToDollars(potBb, bigBlind)})`;
}

export function formatVillains(villains: Villain[], count: number): string[] {
  if (count <= 0) return [];
  const lines: string[] = ["Villains:"];
  for (let i = 0; i < count; i++) {
    const v = villains[i] ?? {};
    const villainAction =
      v.action == null || v.action === "" ? "Unknown" : v.action;
    const parts: string[] = [`  • V${i + 1}`];
    if (v.position) parts.push(v.position);
    if (v.tag) parts.push(`(${v.tag})`);
    if (v.stackBb != null) parts.push(`— ${v.stackBb} BB`);
    parts.push(`— ${villainAction} pre`);
    if (v.note) parts.push(`— note: ${v.note}`);
    lines.push(parts.join(" "));
  }
  return lines;
}

function formatHand(hand: Hand, handNumber: number, bigBlind: number): string {
  const lines: string[] = [];
  const potByStreet = hand.potByStreet ?? {};
  const header = hand.effectiveStack
    ? `${hand.heroPosition} (${hand.effectiveStack})`
    : hand.heroPosition || "—";

  lines.push(`Hand #${handNumber}`);
  lines.push(`Hero: ${header} — ${formatHeroCards(hand)}`);

  const board = formatBoard(hand);
  if (board) lines.push(`Board: ${board}`);
  else if (hand.preflopFolded || hand.preflopAction === "Fold") {
    lines.push("Board: — (ended preflop)");
  } else {
    lines.push("Board: — (no flop logged)");
  }

  if (hand.preflopAction && !hand.preflopActions?.length) {
    const sizing = hand.preflopAmount
      ? ` ${formatPreflopSizing(hand.preflopAmount)}`
      : "";
    lines.push(`Hero preflop (summary): ${hand.preflopAction}${sizing}`);
  }

  lines.push(
    ...formatStreetActionLines("preflop", hand.preflopActions, potByStreet, bigBlind)
  );
  lines.push(
    ...formatStreetActionLines("flop", hand.flopActions, potByStreet, bigBlind)
  );
  lines.push(
    ...formatStreetActionLines("turn", hand.turnActions, potByStreet, bigBlind)
  );
  lines.push(
    ...formatStreetActionLines("river", hand.riverActions, potByStreet, bigBlind)
  );

  lines.push(...formatVillains(hand.villains, hand.villainCount));

  const net = getHandNetChange(hand);
  const netLabel = net >= 0 ? `+$${net}` : `-$${Math.abs(net)}`;
  lines.push(`Result: ${hand.result || "—"} ${netLabel}`);

  if (hand.reviewWanted === true) {
    lines.push("⚑ Review Wanted");
  }

  if (hand.tags.length > 0) {
    lines.push(`Tags: ${hand.tags.map((t) => `#${t}`).join(" ")}`);
  }
  if (hand.notes?.trim()) {
    lines.push(`Notes: ${hand.notes.trim()}`);
  }

  return lines.join("\n");
}

export function formatSessionSummary(session: Session): string {
  const normalized = normalizeSession(session);
  const bigBlind = normalized.bigBlind;

  const start = new Date(normalized.startTime);
  const dateStr = start.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const header = [
    "4 Bigs — Session Log",
    "",
    `Room: ${normalized.roomName || "—"}`,
    `Date: ${dateStr}`,
    `Stakes: ${normalized.stakes} · ${normalized.tableSize}-Max · Start stack: ${normalized.startingStack}`,
  ];

  if (normalized.endTime) {
    const end = new Date(normalized.endTime).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    header.push(`Ended: ${end}`);
  } else {
    header.push("Status: In progress");
  }

  const net = normalized.netAmount ?? 0;
  header.push(
    `Net P&L: ${net >= 0 ? `+$${net}` : `-$${Math.abs(net)}`}`,
    `Hands: ${normalized.hands?.length ?? 0}`,
    ""
  );

  const hands = normalized.hands ?? [];
  if (hands.length === 0) {
    return [...header, "(No hands logged yet)"].join("\n");
  }

  const handBlocks = hands.map((hand, i) =>
    formatHand(hand, i + 1, bigBlind)
  );

  return [...header, handBlocks.join("\n\n────────────────\n\n")].join("\n");
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through */
    }
  }

  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
  return ok;
}
