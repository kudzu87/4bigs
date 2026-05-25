# 4 Bigs — Product Spec & Wireframes

**Version:** May 2026 (live app)  
**URL:** https://4bigs.vercel.app  
**Repo:** https://github.com/kudzu87/4bigs  

---

## 1. Product summary

**4 Bigs** is a local-first, mobile-friendly poker **hand logger** for live sessions. It guides the user through structured hand capture (position, cards, preflop/postflop action, villains, outcome) and stores everything on-device. There is no account system or cloud sync today.

| Attribute | Detail |
|-----------|--------|
| Primary user | Live cash player reviewing sessions later |
| Platform | Web app + PWA (install to home screen) |
| Data | `localStorage` only on the device |
| Monetization | None |

---

## 2. Goals & non-goals

### Goals
- Fast hand entry at the table with haptic feedback
- Full **preflop betting round** before flop (hero + villains, valid actions only)
- Full **postflop** streets with the same round-complete rules
- Session P&amp;L and hand history on device
- **Copy session notes** — plain-text summary for Apple Notes / Notion / etc.
- Resume interrupted hands (wizard draft + active session)

### Non-goals (current)
- Cloud backup / multi-device sync
- GTO solver or equity
- JSON/CSV file export (only clipboard text today)
- Real-time multiplayer
- **Pot size tracking** — deferred to **v2** (street-level pot / stack-to-pot ratios are not captured in MVP)

---

## 3. App navigation (top level)

```
┌─────────────┐
│    HOME     │  Past sessions, start session, copy notes (history)
└──────┬──────┘
       │ Start session
       ▼
┌─────────────┐
│ START       │  Stakes, table size, room, starting stack
│ SESSION     │
└──────┬──────┘
       │
       ▼
┌─────────────┐     Add hand ──► ┌─────────────┐
│ ACTIVE      │◄────────────────│ HAND        │
│ SESSION     │   Save hand     │ WIZARD      │
└──────┬──────┘                 └─────────────┘
       │ End session
       ▼
     HOME (archived session)

Install guide: overlay flow from banner (iOS / Android / Chrome / Edge)
```

---

## 4. Screen wireframes

### 4.1 Home

```
┌──────────────────────────────────┐
│ 4 BIGS          [Saved] Online   │
├──────────────────────────────────┤
│ Welcome back, Hero               │
│ Aggregate profit │ Logged hands  │
│                                  │
│ [ START NEW SESSION ]            │
│                                  │
│ Historical Audit Logs            │
│ ┌──────────────────────────────┐ │
│ │ Room · date · stakes · P&L   │ │
│ │ Latest hand preview    [📋][🗑]│ │
│ └──────────────────────────────┘ │
│                                  │
│ [ Clear local data (testing) ]   │
└──────────────────────────────────┘
```

### 4.2 Active session

```
┌──────────────────────────────────┐
│ Active Studio Session [End Session]│
│ Stakes │ Seats │ Stack │ Net P&L  │
│ [ Copy session notes ]           │
├──────────────────────────────────┤
│ [ ADD HAND TO TRACKER ]          │
│                                  │
│ Hand #2  BTN (100bb)    Won $45  │
│ [Ah][Kd]    Board or Preflop end │
│ ┌ Action Log ──────────────────┐ │
│ │ Preflop: Hero Bet …          │ │
│ │ Flop: Hero Check …           │ │
│ └──────────────────────────────┘ │
│ #tags   notes…                   │
│ [ Edit ]  [ Delete ]             │
└──────────────────────────────────┘
```

### 4.3 Hand wizard — flow overview

Progress dots: steps **3–20** (steps 1–2 unused; wizard opens at 3).

```
 3 Effective stack
 4 Hero position
 5–6 Hero cards (auto-advance on rank+suit)
 7 Hero preflop action (+ sizing if raise/3-bet/all-in)
 8 Villain count (0 → skip to notes)
 9 Villain profile(s) — seat, tags, notes per villain
10 Preflop live action — full round, position order
11–13 Flop cards (auto-advance)
14 Flop live action
15 Turn card
16 Turn live action
17 River card
18 River live action
19 Outcome (Won / Lost / Split + $)
20 Notes & review tags → SAVE HAND
```

### 4.4 Step 7 — Hero preflop

```
┌──────────────────────────────────┐
│ Step 7: Hero Preflop Action      │
├──────────────────────────────────┤
│ What was your preflop action?    │
│                                  │
│ [Fold][Limp][Call]               │
│ [Raise][3-Bet][All-In]           │
│                                  │
│ Select bet sizing (if needed):   │
│ [Small][Standard][Large][All-In] │
│ custom amount + Confirm          │
└──────────────────────────────────┘
```

### 4.5 Step 10 — Preflop live action

```
┌──────────────────────────────────┐
│ Step 10: Preflop Live Action      │
├──────────────────────────────────┤
│ Hole: Ah Kd          Preflop     │
│ ┌ Current turn ────────────────┐ │
│ │      [SB]                    │ │
│ │   Villain 1                  │ │
│ │   Facing Bet / Raise         │ │
│ └──────────────────────────────┘ │
│ [Fold] [Call]  [Raise]           │
│ ── or Check/Bet when unopened ── │
│                                  │
│ Preflop Action Log               │
│ [1] Hero (BTN) Bet [Standard]    │
│ [2] Villain 1 (SB) Raise [3x]    │
│                                  │
│ [ Skip to outcome ]              │
└──────────────────────────────────┘
```

Round completes → flop cards (step 11) or outcome (step 19) if folded / one player left.

### 4.6 Postflop live (steps 14 / 16 / 18)

Same layout as preflop live; valid actions:
- **Unopened:** Check, Bet (+ sizing)
- **Facing bet:** Fold, Call, Raise (+ sizing)

---

## 5. Functional spec — betting rounds

### 5.1 Preflop valid actions

| Situation | Actions shown |
|-----------|----------------|
| No bet yet (`highestBet = 0`), hero hasn’t acted | Fold, Limp, Bet |
| No bet yet, already acted (matched) | Fold, Check, Bet |
| Facing a bet | Fold, Call, Raise |

### 5.2 Postflop valid actions

| Situation | Actions shown |
|-----------|----------------|
| Unopened | Check, Bet |
| Facing bet | Fold, Call, Raise |

### 5.3 Round completion

- **Unopened street:** every active player has `actedThisRound`
- **Betting street:** next actor has matched `highestBet` and has acted
- **One player left:** jump to outcome (step 19)

### 5.4 Hero preflop seeding (step 7 → 10)

If hero is **first to act** by seat order, step 7 choice (Limp / open Bet / Raise) is applied when step 10 loads so live logging continues with villains. If villains act first, step 10 starts from earliest seat; hero acts when action reaches them.

---

## 6. Villain position logic

On **step 9 (Villain profile)**, the app suggests which seats each villain can occupy. That list is filtered using what you entered on **step 7 (Hero preflop action)** and how many villains you chose on step 8.

**How to read “earlier” and “later”**

- The table uses the game’s **preflop action order** for your table size (e.g. on 9-max: UTG → … → BTN → SB → BB).
- **Earlier positions** = seats that typically act **before** hero on that street.
- **Later positions** = seats that typically act **after** hero.
- The filter is about **who could logically have put in the action before you**, not about postflop order.

**Rules (evaluated in this order)**

| Hero line (step 7) | Villain count | Seats offered for villains |
|--------------------|---------------|---------------------------|
| **Limp** or **Raise** | Any | **Later positions only** — villains who act after you |
| **Call** or **3-Bet** | Exactly **1** | **Earlier positions only** — the raiser / aggressor acts before you |
| **Call** or **3-Bet** | **2 or more** | **Earlier + later positions** — no seat filter (full table) |
| Other (e.g. Fold, All-In, or empty) | Any | **Earlier + later positions** — no seat filter |

**Note:** **Raise** is always treated as an aggressive/opening line (first row), so it never uses the “call / 3-bet vs one raiser” earlier-only rule. Only **Call** and **3-Bet** do.

After **step 10 (Preflop live action)** finishes, villain `action` fields are updated from the action log; seat choices from step 9 may be re-sanitized if they no longer fit the inferred line.

**Remembering hero’s line when villains act first**

| Hero step 7 | On step 9 (villain profile) | On step 10 (when hero faces a bet) |
|-------------|-----------------------------|-------------------------------------|
| **Call** | Villain action pre-selected **Raise**; hero line shown in banner | **Call** highlighted with step 7 sizing; one tap to log |
| **Raise** | Villain action pre-selected **Call** (hero opened first) | Hero open already seeded if hero acts first |

Villains still log their raises in the live round on step 10; step 9 pre-selection is a shortcut for who acted before hero.

### Example A — Hero raises (later positions only)

- **Table:** 9-max  
- **Hero:** CO  
- **Step 7:** Raise  
- **Villains:** 1  

Hero opened or raised from CO, so villains should sit **after** CO in preflop order. The picker shows **BTN, SB, BB** (not UTG–HJ). The UI hint: *“Based on your limp/raise, villains are in later positions (acted after you).”*

### Example B — Hero calls a 3-bet (earlier positions only, one villain)

- **Table:** 9-max  
- **Hero:** BTN  
- **Step 7:** **Call** (you flat-called a 3-bet or raise)  
- **Villains:** 1  

Hero is continuing vs a preflop aggressor, so that villain should be in a seat that **acted before** BTN. The picker shows **UTG through CO** only (not SB/BB as the “raiser” seat). The UI hint: *“Based on your call/3-bet, the raiser is in an earlier position.”*

If you set **2+ villains** with the same **Call** or **3-Bet** line, the filter is turned off and **earlier + later positions** are all available — the app no longer assumes a single earlier-position raiser.

---

## 7. Data model (summary)

### Session
- `id`, `startTime`, `endTime?`, `stakes`, `tableSize`, `roomName`, `startingStack`
- `hands[]`, `netAmount`, `draft?` (in-progress wizard)

### Hand (per hand)
- Hero: `heroPosition`, `heroPositionIndex`, `heroCards[2]`, `effectiveStack`
- Preflop: `preflopAction`, `preflopAmount`, `preflopActions[]`, `preflopFolded?`
- Villains: `villainCount`, `villains[]` (position, tag, action, notes, street fold flags)
- Board: `boardFlop[3]`, `boardTurn`, `boardRiver`
- Actions: `flopActions[]`, `turnActions[]`, `riverActions[]`
- Result: `result`, `resultAmount`, `notes`, `tags[]`

> **Pot size (not in MVP):** Per-street pot size is **not** stored on `Hand` today. Bet sizing in action logs is qualitative (e.g. `[Standard]`, `[1/2 pot]`). When pot tracking ships in v2, `src/lib/betting-round.ts` is the intended place to compute and persist pot state through the betting-round engine.

### Storage keys
- `four_bigs_sessions` — completed sessions
- `four_bigs_active_session` — live session + optional wizard draft

---

## 8. Export — copy session notes

**Trigger:** “Copy session notes” (active session) or copy icon (history).

**Output:** Plain text, e.g.:

```
4 Bigs — Session Log

Room: Bellagio $1/2
Date: Mon, May 25, 2026, 8:30 PM
Stakes: 1/2 · 9-Max · Start stack: 200
Status: In progress
Net P&L: +$85
Hands: 2

────────────────

Hand #1
Hero: BTN (100bb) — Ah Kd
Board: Ah 7c 2d · 9s · 3h
Preflop:
  • Hero Bet [Standard]
  • Villain 1 SB Raise [3x]
  • Hero Call
Flop:
  • Hero Check
  • Villain 1 Bet [1/2]
  • Hero Call
Turn:
  • Hero Check
  • Villain 1 Check
River:
  • Hero Bet [3/4]
  • Villain 1 Fold
Villains:
  • V1 SB (Reg)
Result: Won +$45
Tags: #Value Bet
Notes: Villain overfolded river.
```

### 8.1 Tags

Hand review tags are optional metadata attached when you finish a hand on **step 20 (Notes & Analysis)**.

| Aspect | Spec |
|--------|------|
| **Entry** | **Suggested review chips** on step 20 (`REVIEW_TAGS` in `constants.ts` — e.g. Bluff, Value Bet, Big Fold); tap to toggle |
| **Storage** | `hand.tags` — a **string array** on each `Hand` (values stored **without** the `#` prefix) |
| **Export** | One line per hand in copy output: `Tags: #tag1 #tag2` (hash added at render time in `session-summary.ts`) |
| **Taxonomy** | **Suggested set in MVP** — UI offers a fixed chip list; the array could hold other strings later, but users cannot type custom tags today |

Tags are separate from villain **profile tags** on step 9 (e.g. Fish, Reg from `PROFILE_TAGS`), which describe opponents, not hand review.

---

## 9. PWA & offline

- Serwist service worker, manifest, icons
- Install guide per platform (Share → Add to Home Screen on iOS; Chrome/Edge install prompt on desktop)
- Offline page at `/~offline`; data still localStorage when online returns

---

## 10. Testing utilities

| Control | Location | Behavior |
|---------|----------|----------|
| Clear local data (testing) | Home (bottom) | Confirm → wipe both storage keys, reset UI to home |

Remove before production marketing if desired.

---

## 11. Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| Language | TypeScript |
| PWA | Serwist |
| Deploy | Vercel |

Key modules: `HandWizard`, `PreflopLiveActionLogger`, `PostflopLiveActionLogger`, `betting-round.ts`, `session-summary.ts`, `positions.ts`, `storage.ts`.

---

## 12. Future enhancements (backlog)

- JSON backup / restore file
- CSV export
- Optional cloud sync
- Hand replayer view
- Remove or hide testing clear-data button

---

## 13. Document history

| Date | Change |
|------|--------|
| May 2026 | Initial spec: preflop live action, hero step 7, copy notes, PWA, testing reset |

---

*Share this file as-is (Markdown), or export to PDF from GitHub / your editor.*
