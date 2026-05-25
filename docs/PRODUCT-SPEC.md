# 4 Bigs — Product Spec & Wireframes

**Version:** May 2026 (live app)  
**URL:** https://4bigs.vercel.app  
**Repo:** https://github.com/kudzu87/4bigs  

---

## 1. Product summary

**4 Bigs** is a local-first, mobile-friendly **live poker hand logger** for cash-game players who want structured session notes without spreadsheets or cloud accounts. You start a session (stakes, table size, room), log hands through a guided **20-step wizard**, and review or copy everything as plain text for Notes, Notion, or study later.

**What you capture per hand**
- Hero position, stack, hole cards, and preflop line with **BB-based sizing** (2BB–5BB, All-In, custom)
- Up to five villains: seat (filtered by your preflop line), player type tags, preflop action, notes
- Full **preflop and postflop betting rounds** in seat order — only valid actions at each decision point
- Board runout, street-by-street action with **pot-aware sizing** (1/3, 1/2, 2/3, Pot, etc., shown in dollars at the table)
- Outcome (Won / Lost / Split + amount), freeform notes, and **grouped review tags** (spot type, your decision, session state)

**What makes the logging smart**
- **Villain seat suggestions** follow poker logic (e.g. Call → raiser in an earlier seat; Raise/3-Bet → villains after you)
- **Preflop can auto-complete** when step 7 + villain profiles already define the line — no duplicate logging on step 10
- **Pot tracking in BB** (1.5 BB blind seed, snapshots per street on `Hand.potByStreet`) drives postflop bet sizes and **export dollar amounts** via session `bigBlind`

**Session tools**
- Running **net P&amp;L** across hands, hand ledger in-session, edit/delete
- **Copy session notes** — one tap clipboard export with pot per street and resolved `$` on each wager
- **Resume** interrupted hands (wizard draft + active session in `localStorage`)
- **PWA** install for phone home-screen use; works offline for the app shell, data stays on-device

| Attribute | Detail |
|-----------|--------|
| Primary user | Live cash player building a reviewable hand history |
| Platform | Web app + PWA ([4bigs.vercel.app](https://4bigs.vercel.app)) |
| Data | `localStorage` only — no account, no cloud sync |
| Monetization | None |

---

## 2. Goals & non-goals

### Goals
- Fast hand entry at the table with haptic feedback
- Full **preflop betting round** before flop (hero + villains, valid actions only)
- Full **postflop** streets with the same round-complete rules
- Session P&amp;L and hand history on device
- **Copy session notes** — plain-text summary with pot per street and resolved dollar amounts
- Resume interrupted hands (wizard draft + active session)

### Non-goals (current)
- Cloud backup / multi-device sync
- GTO solver or equity
- JSON/CSV file export (only clipboard text today)
- Real-time multiplayer
- Solver-grade stack-to-pot ratios beyond stored pot snapshots

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
│ Select open size (BB):           │
│ [2BB][2.5BB][3BB]              │
│ [4BB][5BB][All-In]             │
│ [Custom] → numeric BB + Confirm│
│ (each preset shows $ at stakes)│
└──────────────────────────────────┘
```

**Sizing storage:** `preflopAmount` stores a BB multiplier as a string (`"2"`, `"2.5"`, …) or `"all-in"`. Custom uses a numeric BB value (e.g. `"7.5"`).

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
│ [1] Villain 1 (CO) Bet [3]       │
│ [2] Hero (BTN) Call              │
│ (or auto-skipped if step 7+9     │
│  already closed the round)       │
│                                  │
│ [ Skip to outcome ]              │
└──────────────────────────────────┘
```

Round completes → flop cards (step 11) or outcome (step 19) if folded / one player left.

### 4.6 Postflop live (steps 14 / 16 / 18)

Same layout as preflop live; valid actions:
- **Unopened:** Check, Bet (+ sizing)
- **Facing bet:** Fold, Call, Raise (+ sizing)

**Pot in UI:** Header shows current pot as **$X (Y BB)** using live `streetState.pot` and session `bigBlind`.

**Bet/raise sizing buttons:** `1/3`, `1/2`, `2/3`, `Pot`, `All-In`, `Custom` — fractional labels show resolved **dollar amount** under each chip (based on pot at action time). Custom uses a numeric BB input.

---

## 5. Functional spec — betting rounds

### 5.1 Preflop valid actions

| Situation | Actions shown |
|-----------|----------------|
| No bet yet (`highestBet = 0`), hero hasn’t acted | Fold, Limp, Bet |
| No bet yet, already acted (matched) | Fold, Check, Bet |
| Facing a bet | Fold, Call, Raise |

**Preflop sizing (BB-based):**

| Context | Options | Stored as |
|---------|---------|-----------|
| Step 7 hero open / 3-bet / all-in | 2BB, 2.5BB, 3BB, 4BB, 5BB, All-In, Custom (numeric BB) | `preflopAmount` string (`"2"`, `"2.5"`, `"all-in"`, …) |
| Step 10 live Bet / Raise | Same BB presets + Custom | Sizing suffix in `preflopActions[]` log lines |

**Engine:** Preflop pot seeds at **1.5 BB** (SB + BB). Each Limp / Call / Bet / Raise adds the resolved BB increment to `pot`. Contributions and `highestBet` are tracked in BB.

### 5.2 Postflop valid actions

| Situation | Actions shown |
|-----------|----------------|
| Unopened | Check, Bet |
| Facing bet | Fold, Call, Raise |

**Postflop sizing (fractional pot):**

| Label | Resolved wager (BB) |
|-------|---------------------|
| `1/3` | Pot at action start ÷ 3 |
| `1/2` | Pot at action start ÷ 2 |
| `2/3` | Pot at action start × 2/3 |
| `pot` | Full pot at action start |
| `all-in` | (handled as qualitative) |
| Custom | Numeric BB entered by user |

### 5.3 Round completion

- **Unopened street:** every active player has `actedThisRound`
- **Betting street:** next actor has matched `highestBet` and has acted
- **One player left:** jump to outcome (step 19)

### 5.4 Hero preflop seeding (step 7 → 10)

If hero is **first to act** by seat order, step 7 choice (Limp / open Bet / Raise / 3-Bet with BB sizing) is applied when step 10 loads so live logging continues with villains. If villains act first, step 10 starts from earliest seat; hero acts when action reaches them.

When **step 7 + step 9 villain profile actions** fully close the preflop round (e.g. hero Call, villain Raise, hero Call), step 10 is **auto-skipped** and the hand jumps to flop cards — `preflopActions[]` and `potByStreet.preflop` are saved from the engine replay.

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
| **Limp**, **Raise**, or **3-Bet** | Any | **Later positions only** — villains who act after you |
| **Call** | Exactly **1** | **Earlier positions only** — the raiser acts before you |
| **Call** | **2 or more** | **Earlier + later positions** — no seat filter (full table) |
| Other (e.g. Fold, All-In, or empty) | Any | **Earlier + later positions** — no seat filter |

**Note:** **3-Bet** is treated like **Raise** — an aggressive re-raise where hero acts before villains in the profile step (`heroPreflopActsBeforeVillains` includes Limp, Raise, and 3-Bet). Only **Call** (with one villain) uses the earlier-only raiser seat filter.

After **step 10 (Preflop live action)** finishes — or when the round is auto-completed from step 7 + 9 — villain `action` fields are updated from the action log; seat choices from step 9 may be re-sanitized if they no longer fit the inferred line.

**Remembering hero’s line when villains act first**

| Hero step 7 | On step 9 (villain profile) | On step 10 (when hero faces a bet) |
|-------------|-----------------------------|-------------------------------------|
| **Call** | Villain action pre-selected **Raise**; hero line shown in banner | **Call** highlighted with step 7 sizing; one tap to log |
| **Raise** | Villain action pre-selected **Call** (hero opened first) | Hero open already seeded if hero acts first |
| **3-Bet** | Villains act after hero (no “villains act first” banner) | Hero 3-bet already seeded if hero acts first |

When step 7 + step 9 define the full preflop line, step 10 may be skipped entirely (see §5.4).

### Example A — Hero raises (later positions only)

- **Table:** 9-max  
- **Hero:** CO  
- **Step 7:** Raise  
- **Villains:** 1  

Hero opened or raised from CO, so villains should sit **after** CO in preflop order. The picker shows **BTN, SB, BB** (not UTG–HJ). The UI hint: *“Based on your limp/raise, villains are in later positions (acted after you).”*

### Example B — Hero calls a raise (earlier positions only, one villain)

- **Table:** 9-max  
- **Hero:** BTN  
- **Step 7:** **Call** (you flat-called a raise or 3-bet)  
- **Villains:** 1  

Hero is continuing vs a preflop aggressor, so that villain should be in a seat that **acted before** BTN. The picker shows **UTG through CO** only (not SB/BB as the “raiser” seat). The UI hint: *“Based on your call/3-bet, the raiser is in an earlier position.”* (shown for **Call** only; **3-Bet** uses the later-positions rule in Example C).

If you set **2+ villains** with **Call**, the filter is turned off and **earlier + later positions** are all available — the app no longer assumes a single earlier-position raiser.

### Example C — Hero 3-bets (later positions only)

- **Table:** 6-max  
- **Hero:** CO  
- **Step 7:** **3-Bet** (with sizing e.g. 3BB)  
- **Villains:** 1  

Hero re-raised as the aggressor, so villains sit in **later** seats (BTN, SB, BB). Step 9 does **not** show “villains act before you.”

---

## 7. Data model (summary)

### Session
- `id`, `startTime`, `endTime?`, `stakes`, `bigBlind` (dollars per BB, parsed from stakes e.g. `1/2` → `2`), `tableSize`, `roomName`, `startingStack`
- `hands[]`, `netAmount`, `draft?` (in-progress wizard)

### Hand (per hand)
- Hero: `heroPosition`, `heroPositionIndex`, `heroCards[2]`, `effectiveStack`
- Preflop: `preflopAction`, `preflopAmount` (BB multiplier string), `preflopActions[]`, `preflopFolded?`
- Villains: `villainCount`, `villains[]` (position, tag, action, notes, street fold flags)
- Board: `boardFlop[3]`, `boardTurn`, `boardRiver`
- Actions: `flopActions[]`, `turnActions[]`, `riverActions[]`
- Pot: `potByStreet?` — `{ preflop?, flop?, turn?, river? }` each in **BB** at end of that street’s betting
- Result: `result`, `resultAmount`, `notes`, `tags[]`

### Storage keys
- `four_bigs_sessions` — completed sessions
- `four_bigs_active_session` — live session + optional wizard draft

---

## 7.1 Pot tracking

Live betting (`betting-round.ts` + wizard street state) tracks pot in **BB** during the hand; snapshots persist on the saved `Hand`.

| Concept | Detail |
|---------|--------|
| **Live state** | `StreetState.pot` — running pot in BB; updates on Limp / Call / Bet / Raise |
| **Preflop seed** | **1.5 BB** (SB 0.5 + BB 1.0) before first action |
| **Postflop wagers** | Fractional labels (`1/3`, `1/2`, `2/3`, `pot`) resolve against **pot at the start of that action** |
| **Preflop wagers** | Step 7 / live Bet-Raise use BB multipliers (`2`, `2.5`, …) |
| **Snapshots** | `StreetState.potByStreet` during play; copied to `Hand.potByStreet` on save and when each street completes |
| **Carry-forward** | Flop/turn/river init uses the previous street’s ending pot (BB) |

**Dollar conversion:** At export and in postflop UI hints, BB × `session.bigBlind` → dollars. `parseBigBlindFromStakes()` derives `bigBlind` when missing on older sessions.

**Not stored:** Per-action dollar amounts in the log arrays (still sizing labels); export **replays** actions to compute `— $X` suffixes. Check / Fold omit dollar amounts.

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
Preflop: (pot $3)
  • Villain 1 CO Bet [3BB] — $6
  • Hero Call — $6
Flop: (pot $18)
  • Hero Check
  • Villain 1 Bet [1/2] — $9
  • Hero Call — $9
Turn: (pot $36)
  • Hero Check
  • Villain 1 Check
River: (pot $36)
  • Hero Bet [2/3] — $24
  • Villain 1 Fold
Villains:
  • V1 CO (Reg) — Raise pre
Result: Won +$45
Tags: #Thin Value #Single Raised Pot
Notes: Villain overfolded river.
```

- **Street headers** — `Preflop: (pot $X)` uses pot at **start** of that street’s betting (from `hand.potByStreet` + engine replay).
- **Action lines** — sizing label kept in brackets; **resolved increment** shown as `— $Y` (omitted for Check / Fold).
- **Villains block** — profile preflop action; missing action exports as `Unknown`.

### 8.1 Tags

Hand review tags are optional metadata attached when you finish a hand on **step 20 (Notes & Analysis)**.

| Aspect | Spec |
|--------|------|
| **Entry** | **Grouped review chips** on step 20 (`REVIEW_TAG_GROUPS`: Spot type, My decision, Session state); tap to toggle |
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
| May 2026 | BB preflop sizing, pot tracking (`potByStreet`, `bigBlind`), export dollar amounts, 3-bet position fix |
| May 2026 | Grouped review tags (`REVIEW_TAG_GROUPS`), step 20 UI by category |

---

*Share this file as-is (Markdown), or export to PDF from GitHub / your editor.*
