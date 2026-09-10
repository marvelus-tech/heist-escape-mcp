# Heist Escape: Solution Guide

> **SPOILER WARNING.** This file contains every answer, the twist, and the win condition. For hosts and operators only. Do not put it on the Stage screen.

Canonical story, ids and clue text live in [`docs/redesign/COMBINED-PROGRAM.md`](redesign/COMBINED-PROGRAM.md). This guide is the walkthrough view of that program.

---

## The story in one paragraph (SPOILER)

A curator, Dr. Elena Bright, has hired an outside "security red-team" to audit the museum before the *Diamonds Through the Ages* gala. That is the cover. Privately she believes trustee and lender Marcus Wexler ("M") has swapped the Sunburst Diamond for a display replica. Your job is to reach the vault and **verify which stone is real**. The one on the pedestal is the fake. The authentic Sunburst is in the curator hold on the steel shelves, and only Elena's keycard opens it.

## Who knows what (Examiner vs Operator)

| | Examiner (agent, via MCP) | Operator (human, via phone) |
|---|---|---|
| Story they are told | Cover story **plus** the classified note: Elena suspects M., verify authenticity, trust the shelves over the pedestal (`get_briefing`) | Cover story only: pre-gala red-team audit |
| What they can see | Placards, blueprints, the catalog card, everything `examine_object` returns | Drawer contents (schedule, audit notebook, loan clause) and code results, shown as phone alerts |
| What they do | Take items, unlock and open doors, pull the painting, examine | Open drawers, enter codes |
| Learns the twist | From the briefing and the 7734 card, before the vault | Live, on the Stage, when the pedestal is examined |

Neither role can finish alone: the digits are split across drawers (Operator) and placards (Examiner), the Operator enters the codes, and the Examiner takes the items.

---

## Answers at a glance (SPOILER)

| Puzzle | Answer | Where it comes from |
|---|---|---|
| Gallery A door | `gallery-a-key`, hidden in `flower-arrangement` | Lobby |
| Archives door | same `gallery-a-key` | Gallery A |
| Card catalog drawer | `7734` | Visitor log in the Lobby |
| Vault Access door | `pull` the `hidden-painting` | Archives |
| Vault keypad | `3891` | 3 sweeps, 8 loan pieces, clause 9, Sub-Level 1 |
| Win | `curator-keycard` (room 4) + `steel-shelves` (room 5) -> take `sunburst-diamond` | Vault |

Assembly rule, in-world: the exhibition code is the four "house figures" in walking order, Lobby first.

---

## Room 1: Museum Lobby

**Surface story (the Lobby lie):** the poster board says the cameras are offline for scheduled maintenance, and the notebook in the bottom drawer is a "routine pre-gala code audit". Both are M.'s and Elena's covers respectively. Nothing here is what it claims to be.

### Digit 1 = 3 (Operator)

1. `open_drawer reception-desk-middle`
2. Staff schedule for gala week: "Night security sweeps: **3** per night (22:00, 01:00, 04:00). Cameras offline for maintenance until gala night, per M.W."
3. The sweep count is the Lobby figure.

### Assembly rule, part one (Operator)

1. `open_drawer reception-desk-bottom`
2. Audit notebook: "Exhibition code is rebuilt from four house figures in walking order: Lobby, Gallery A, Archives, Vault Access. Lobby figure: the nightly sweeps. Gallery A figure: the loan. Remaining figures: see curator."
3. "See curator" points at catalog card 7734 in the Archives.

### Catalog code (Examiner)

- `examine_object visitor-log`: "E. Bright, Room 3-A, Catalog #**7734**, pull for gala review". Remember it for room 3.

### Key and exit (Examiner)

1. `examine_object flower-arrangement` reveals a brass key tagged "Gallery A Access".
2. `use_item` itemName `gallery-a-key`, action `take`. It lands in shared inventory.
3. `use_item` action `open`, target `gallery-a`. With the key in inventory this unlocks and moves the team in one step. (`unlock` then `open` also works.)

Extras: `poster-board` (camera notice), Phone Post-it ("Gallery A key in the lobby flowers, per usual. E."), `reception-desk-top` (business cards, flavor).

**Carry forward:** `3`, `7734`, `gallery-a-key`.

---

## Room 2: Gallery A - Renaissance Wing

### Digit 2 = 8 (Examiner)

1. `examine_object display-case-west`
2. Placard: "Renaissance Jewelry Collection. Loaned by the Wexler Foundation. **8** pieces on display. Please see curator for Vault storage protocols."
3. The loan count is the Gallery A figure (the notebook said "Gallery A figure: the loan").

### Exit (Examiner)

- `use_item` action `open`, target `archives` (or `archives-door`). The brass key from the flowers fits this door too.

Red herrings: `painting-landscape` (Belmont Estate, 1973), `velvet-rope`.

**Carry forward:** `3 8`.

---

## Room 3: Archives Room

### Elena's reveal + assembly confirmation (Operator enters, Examiner reads)

1. Operator: `enter_code` code `7734`, target `card-catalog`. The drawer `card-catalog-7734` unlocks and its card is read out.
2. Card 7734, front: "Sunburst Diamond, 45.2 ct, fancy vivid yellow."
3. Back, in Elena's hand: "If you are reading this, M. has already asked for the display copy two weeks early. **Do not trust the pedestal.** My keycard opens the curator hold on the shelves. The code is the house figures in walking order, Lobby first: **sweeps, loan pieces, the clause, the level.** E.B."
4. This confirms the four facts and their order without handing over digits. `open_drawer card-catalog-7734` re-reads it later.

### Digit 3 = 9 (Operator)

1. `open_drawer filing-j-l`
2. Wexler Foundation loan agreement, "Clause **9**: the Foundation may substitute a certified display replica for any insured piece without notice." Elena's sticky: "Clause 9. This is how he would do it. E.B."
3. The clause number is the Archives figure, and it tells you how the swap was done.

### Exit (Examiner)

1. `use_item` itemName `hidden-painting`, action `pull` (also accepts `press`, `use`, `open`). The seascape swings aside and `vault-access` is revealed and unlocked.
2. `use_item` action `open`, target `vault-access`.

Red herring: `desk-lamp` ("To Elena, For Late Nights - M"). Flavor, but it does tell you M. and Elena are close.

**Carry forward:** `3 8 9`, and: pedestal bad, shelves good, get Elena's keycard.

---

## Room 4: Vault Access Corridor

### Digit 4 = 1 (Examiner)

1. `examine_object blueprint-frame`
2. Floor plan marks the Vault and this corridor as "Sub-Level **1** (B1)". The level is the last figure.

### Curator keycard (Examiner) - DO THIS BEFORE THE CODE

1. `examine_object maintenance-locker`: cleaning supplies, a flashlight, and a lanyard keycard "Curator: Dr. Elena Bright".
2. `use_item` itemName `curator-keycard`, action `take`.

> **Sequencing trap.** A correct keypad code moves the whole team into the Vault, and the Vault has no exits. If you punch `3891` without the keycard you cannot come back for it, and the authentic stone stays locked. Take the keycard first.

### Keypad (Operator)

1. Walking order: sweeps `3`, loan pieces `8`, clause `9`, level `1`.
2. `enter_code` code `3891`, target `vault-keypad`.
3. "BEEP BEEP BEEP" success message, `vault` unlocks, the team is moved to room 5 automatically.

**Carry forward:** `curator-keycard`.

---

## Room 5: The Vault

### The twist (Examiner)

1. `examine_object pedestal-diamond` (listed as "The Sunburst Diamond on a pedestal").
2. Under the glass the girdle carries a laser inscription: **"WF DISPLAY COPY"**. Wexler Foundation. It is the replica.
3. It is not takeable. Any `take` attempt just returns the inscription. Elena was right.

### The authentic stone (Examiner, needs the keycard)

1. `examine_object steel-shelves`. One case is tagged "Curator hold - E.B." with a keycard reader. With `curator-keycard` in inventory the reader accepts it and the authentic Sunburst Diamond is revealed.
2. `use_item` itemName `sunburst-diamond`, action `take`.
3. **Authentic Sunburst secured. Heist complete.** Inventory shows `sunburst-diamond`, the Stage shows the climax ribbon.

Without the keycard, `steel-shelves` only reports the locked case and the reader. That is the failure state to avoid.

Red herring: `environmental-controls`.

---

## Speedrun path (5 to 10 minutes)

```
R1  open_drawer reception-desk-middle (3) | open_drawer reception-desk-bottom (order)
    examine visitor-log (7734) | examine flower-arrangement | take gallery-a-key | open gallery-a
R2  examine display-case-west (8) | open archives
R3  enter_code 7734 @card-catalog | open_drawer filing-j-l (9) | pull hidden-painting | open vault-access
R4  examine blueprint-frame (1) | examine maintenance-locker | take curator-keycard | enter_code 3891 @vault-keypad
R5  examine pedestal-diamond (replica) | examine steel-shelves | take sunburst-diamond
```

Twenty tool calls, no backtracking.

---

## Progressive hints (three per room)

Hints name the object holding a fact; they never state a digit.

- **Room 1:** the desk drawers are worth a look / the schedule and the audit notebook both mention how the code is built / the flowers hide the Gallery A key, and the visitor log has a catalog number you will need later.
- **Room 2:** the Archives door takes the same brass key / read the placards, not just the jewelry / the western case placard says how many pieces Wexler lent.
- **Room 3:** the lobby log said Catalog #7734, try it on the card catalog / Elena's card explains the order of the four figures / the J-L drawer holds the Wexler loan agreement, and Elena flagged one clause.
- **Room 4:** four figures, walking order, Lobby first / the blueprint says what level you are on / check the locker before you touch the keypad; the vault is one-way.
- **Room 5:** look closely at the stone on the pedestal / Elena said trust the shelves / the curator keycard opens the hold on the steel shelves.

---

## Common mistakes

1. **Entering `3891` before taking the keycard.** One-way door. Restart the session.
2. **Taking the pedestal stone as the win.** It refuses, by design. The inscription is the tell.
3. **Wrong order.** Walking order is Lobby, Gallery A, Archives, Vault Access: `3891`, not `1983`.
4. **Skipping 7734.** You can brute-force the digits from the four facts, but the card is where the story lands and where the keycard is named.
5. **Operator entering codes with no target.** The phone requires a target (`card-catalog` or `vault-keypad`).

---

## Technical notes

- All answers are validated server-side (Durable Object + D1); nothing in the client bundle spoils the game.
- Codes go through `enter_code`; doors through `use_item` with `unlock`/`open`; hidden items (`gallery-a-key`, `curator-keycard`, `sunburst-diamond`) are found with `examine_object` and taken with `use_item ... take`.
- Session state survives disconnects. Rejoining with the same `sessionId` and player name resumes.
- Many sessions can run at once; each Stage "Start Demo" mints a new `demo-XXXX` id.
