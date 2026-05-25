Absolutely — here’s the **copy-paste spec** for the **Start Session** workflow, updated with your rules. I’ve kept it tight and product-ready. [nngroup](https://www.nngroup.com/articles/web-form-design/)

***

# Start Session Spec

## Purpose
Create a new live poker session as fast as possible, using only the MVP game/stakes/table-size options. This screen should be simple, mobile-first, and optimized for one-handed use. [formsonfire](https://www.formsonfire.com/blog/mobile-form-design)

## MVP Rules
- Game type: **NLH only**.
- Stakes: **1/2, 1/3, 2/5 only**.
- Table size: **6, 8, 9, 10 only**.
- Room name: **free text for MVP**.
- Room name becomes **dropdown/autocomplete later** once enough history exists.
- Table size must be available at session start so hand input can prefill likely positions. [coveo](https://www.coveo.com/blog/autocomplete-suggestions-ux-best-practices/)

## Required Fields
- Game type.
- Stakes.
- Table size.
- Room name.

## Optional Fields
- Session notes.
- Any future metadata we decide to add later.

## Field Behavior
### Game Type
- Hard-coded to **NLH**.
- No other game types shown in MVP.

### Stakes
- Display as a simple pick list.
- Allowed values only:
  - 1/2
  - 1/3
  - 2/5

### Table Size
- Display as a simple pick list.
- Allowed values only:
  - 6
  - 8
  - 9
  - 10

### Room Name
- Free text input for MVP.
- Allow any value.
- Save exact text entered by the user.
- Later versions should replace or augment this with dropdown/autocomplete from past room names. [eleken](https://www.eleken.co/blog-posts/dropdown-menu-ui)

## Layout
Use a single-column mobile form:
1. Game type.
2. Stakes.
3. Table size.
4. Room name.
5. Start Session button.

Keep labels above fields, not inside placeholders. Use short field labels and clear tap targets. [nngroup](https://www.nngroup.com/articles/web-form-design/)

## Start Session Button
Primary action button should be:
- Large.
- Full width.
- Clearly labeled **Start Session**.

Secondary action:
- **Cancel** or **Back**.

## Validation Rules
- Do not allow a session to start without stakes, table size, and room name.
- NLH is fixed, so it does not need validation.
- If room name is blank, show an error and block start.
- If a value is not in the allowed list, reject it.

## What Gets Saved
When the user taps **Start Session**, save:
- Session ID.
- Start timestamp.
- Game type = NLH.
- Stakes.
- Table size.
- Room name.
- Session notes if entered.
- Session status = active.

## Why Table Size Matters
Table size must be captured up front because it will be used later to prefill position choices during hand entry. That makes the hand logging flow faster and reduces mistakes. [smartpokerstudy](https://smartpokerstudy.com/wp-content/uploads/2022/08/5-PokerTracker-4-Study-Strategies-EVERY-Player-NEEDS-To-Use-Smart-Poker-Study-PDF.pdf)

## Later Upgrade
Once the app has history:
- Room name can become autocomplete.
- Room name can become a dropdown of recent rooms.
- We can optionally remember common room/stakes/table-size combinations.

## Success Criteria
This workflow is successful if a user can:
1. Open the app.
2. Choose NLH / stakes / table size.
3. Type room name.
4. Tap Start Session.
5. Immediately land in the active hand logging screen.

***

If you want, I can do the next spec the same way: **Active Session / Add Hand workflow**, step by step.

