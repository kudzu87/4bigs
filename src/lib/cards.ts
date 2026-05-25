import type { Card, Hand } from "./types";

export function cardKey(rank: string, suit: string): string {
  return `${rank}${suit}`;
}

export function isCardComplete(card: Card): boolean {
  return !!(card?.rank && card?.suit);
}

export type CardSlot =
  | { zone: "hero"; index: number }
  | { zone: "flop"; index: number }
  | { zone: "turn" }
  | { zone: "river" };

export function getCardAtSlot(hand: Hand, slot: CardSlot): Card {
  switch (slot.zone) {
    case "hero":
      return hand.heroCards[slot.index] ?? { rank: "", suit: "" };
    case "flop":
      return hand.boardFlop[slot.index] ?? { rank: "", suit: "" };
    case "turn":
      return hand.boardTurn ?? { rank: "", suit: "" };
    case "river":
      return hand.boardRiver ?? { rank: "", suit: "" };
  }
}

function isExcluded(slot: CardSlot, zone: CardSlot["zone"], index?: number): boolean {
  if (slot.zone !== zone) return false;
  if (zone === "hero" || zone === "flop") {
    return (slot as { index: number }).index === index;
  }
  return true;
}

/** All complete cards in the hand except the slot being edited. */
export function getUsedCardKeys(hand: Hand, exclude?: CardSlot): Set<string> {
  const keys = new Set<string>();

  const add = (card: Card, zone: CardSlot["zone"], index?: number) => {
    if (exclude && isExcluded(exclude, zone, index)) return;
    if (!isCardComplete(card)) return;
    keys.add(cardKey(card.rank, card.suit));
  };

  hand.heroCards.forEach((c, i) => add(c, "hero", i));
  hand.boardFlop.forEach((c, i) => add(c, "flop", i));
  add(hand.boardTurn, "turn");
  add(hand.boardRiver, "river");

  return keys;
}

export function isCardAlreadyUsed(
  hand: Hand,
  rank: string,
  suit: string,
  exclude?: CardSlot
): boolean {
  if (!rank || !suit) return false;
  return getUsedCardKeys(hand, exclude).has(cardKey(rank, suit));
}

export function isRankDisabled(
  hand: Hand,
  slot: CardSlot,
  rank: string
): boolean {
  const current = getCardAtSlot(hand, slot);
  if (!current.suit) return false;
  return isCardAlreadyUsed(hand, rank, current.suit, slot);
}

export function isSuitDisabled(
  hand: Hand,
  slot: CardSlot,
  suit: string
): boolean {
  const current = getCardAtSlot(hand, slot);
  if (!current.rank) return false;
  return isCardAlreadyUsed(hand, current.rank, suit, slot);
}
