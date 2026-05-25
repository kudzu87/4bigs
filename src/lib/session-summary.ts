import { getHandNetChange } from "./session-math";
import type { Card, Hand, Session, Villain } from "./types";

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

function formatActionBlock(label: string, actions: string[] | undefined): string[] {
  if (!actions?.length) return [];
  return [
    `${label}:`,
    ...actions.map((line) => {
      const stripped = line.replace(/^(Hero|Villain \d+) \([^)]+\) /, "$1 ");
      return `  • ${stripped}`;
    }),
  ];
}

function formatVillains(villains: Villain[], count: number): string[] {
  if (count <= 0) return [];
  const lines: string[] = ["Villains:"];
  for (let i = 0; i < count; i++) {
    const v = villains[i] ?? {};
    const parts: string[] = [`  • V${i + 1}`];
    if (v.position) parts.push(v.position);
    if (v.tag) parts.push(`(${v.tag})`);
    if (v.action) parts.push(`— ${v.action} pre`);
    if (v.note) parts.push(`— note: ${v.note}`);
    lines.push(parts.join(" "));
  }
  return lines;
}

function formatHand(hand: Hand, handNumber: number): string {
  const lines: string[] = [];
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
    const sizing = hand.preflopAmount ? ` ${hand.preflopAmount}` : "";
    lines.push(`Hero preflop (summary): ${hand.preflopAction}${sizing}`);
  }

  lines.push(...formatActionBlock("Preflop", hand.preflopActions));
  lines.push(...formatActionBlock("Flop", hand.flopActions));
  lines.push(...formatActionBlock("Turn", hand.turnActions));
  lines.push(...formatActionBlock("River", hand.riverActions));

  lines.push(...formatVillains(hand.villains, hand.villainCount));

  const net = getHandNetChange(hand);
  const netLabel =
    net >= 0 ? `+$${net}` : `-$${Math.abs(net)}`;
  const amountPart = hand.resultAmount ? ` ($${hand.resultAmount} logged)` : "";
  lines.push(`Result: ${hand.result || "—"} ${netLabel}${amountPart}`);

  if (hand.tags.length > 0) {
    lines.push(`Tags: ${hand.tags.map((t) => `#${t}`).join(" ")}`);
  }
  if (hand.notes?.trim()) {
    lines.push(`Notes: ${hand.notes.trim()}`);
  }

  return lines.join("\n");
}

export function formatSessionSummary(session: Session): string {
  const start = new Date(session.startTime);
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
    `Room: ${session.roomName || "—"}`,
    `Date: ${dateStr}`,
    `Stakes: ${session.stakes} · ${session.tableSize}-Max · Start stack: ${session.startingStack}`,
  ];

  if (session.endTime) {
    const end = new Date(session.endTime).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    header.push(`Ended: ${end}`);
  } else {
    header.push("Status: In progress");
  }

  const net = session.netAmount ?? 0;
  header.push(
    `Net P&L: ${net >= 0 ? `+$${net}` : `-$${Math.abs(net)}`}`,
    `Hands: ${session.hands?.length ?? 0}`,
    ""
  );

  const hands = session.hands ?? [];
  if (hands.length === 0) {
    return [...header, "(No hands logged yet)"].join("\n");
  }

  const handBlocks = hands.map((hand, i) =>
    formatHand(hand, i + 1)
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
