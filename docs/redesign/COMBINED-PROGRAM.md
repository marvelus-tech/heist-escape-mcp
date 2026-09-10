# Heist Escape: Combined Program (Story Bible + Live Path)

This is the single source of truth that the Story-Docs, Seed, Logic and Stage-Juice modules must agree on. If a module cannot match something here, change this file first, then the module.

Ownership: the Story-Docs module owns this file, `docs/SOLUTION_GUIDE.md` and `docs/DEMO_SCRIPT.md`. It does not touch runtime code or `packages/mcp-server/seed.sql`.

Legend:

- **LOCKED** = fixed by the bible. Do not change without a bible revision.
- **CANONICAL** = the reference wording/IDs the docs are written against. Seed/Logic should adopt them verbatim or file a one-line doc update.
- **LIVE** = already true on `main` today.

---

## 1. Premise (LOCKED)

- Light, bright museum heist. Daylight, marble, brass. No cyberpunk, no violence.
- **Cover story (what everyone hears):** the team is a contracted security red-team doing a pre-gala audit of the museum before the *Diamonds Through the Ages* gala.
- **Classified (Examiner only):** Curator Dr. Elena Bright fears trustee and lender Marcus Wexler ("M") has swapped the Sunburst Diamond for a display replica. The real job is to **verify the diamond's authenticity** and secure the authentic stone.
- **The Lobby lie:** the surface story in the Lobby is that the security cameras are "offline for scheduled maintenance" and the notebook on the reception desk is a "routine code audit". Both are true on paper and false in spirit: the camera outage was requested by M., and the audit is Elena's pretext for getting an outside team in.
- **Twist:** the diamond on the vault pedestal is a replica. The authentic Sunburst is in the curator hold on the vault's steel shelves, opened with Elena's curator keycard.
- **Win condition:** the authentic Sunburst Diamond is in shared inventory.

## 2. Numbers (LOCKED)

| Thing | Value | Source room |
|---|---|---|
| Catalog drawer code | `7734` | Learned in Lobby (visitor log), used in Archives |
| Vault keypad code | `3891` | Assembled from four world facts, walking order |
| Digit 1 | `3` | Lobby |
| Digit 2 | `8` | Gallery A |
| Digit 3 | `9` | Archives |
| Digit 4 | `1` | Vault Access Corridor |

Rule: digits are **earned from world facts**. No text anywhere may read "Room N digit is X" or "vault code digit". The `7734` catalog card gives Elena's reveal plus a **confirmation of the assembly rule** (which fact, in which order), not the digits themselves.

## 3. Rooms, exits, doors (LIVE)

| # | Room | Exit ids (`rooms.exits`) | How you leave |
|---|---|---|---|
| 1 | Museum Lobby | `gallery-a` | `gallery-a-key` (from the flowers) |
| 2 | Gallery A - Renaissance Wing | `lobby,archives` | same `gallery-a-key` opens `archives` |
| 3 | Archives Room | `gallery-a,vault-access` | pull `hidden-painting`, reveals and unlocks `vault-access` |
| 4 | Vault Access Corridor | `archives,vault` | `enter_code 3891` at `vault-keypad`, auto-moves the team to room 5 |
| 5 | The Vault | `none` | terminal room |

Door names accept a `-door` suffix (`archives-door` -> `archives`). `use_item open <door>` unlocks in one step if the team already holds a fitting key.

**Sequencing trap (LIVE):** the keypad auto-moves everyone to the Vault and the Vault has no exits. The `curator-keycard` must be taken in room 4 **before** `3891` is entered.

## 4. Objects and clue text (CANONICAL)

Object and drawer ids below are LIVE unless marked *new*. The Operator phone hardcodes the drawer buttons (`reception-desk-top`, `reception-desk-middle`, `reception-desk-bottom`, `filing-j-l`) and the code targets (`card-catalog`, `vault-keypad`); keep those ids.

### Room 1: Museum Lobby

| Object / drawer | Canonical text (what the player reads) | Purpose |
|---|---|---|
| `poster-board` | Poster for *Diamonds Through the Ages*, gala Friday. Taped notice: "Security cameras offline for scheduled maintenance until gala night. Facilities." | The Lobby lie (cameras) |
| `reception-desk` | Mahogany desk, three drawers, nameplate "Curator: Dr. Elena Bright", phone with Post-it | Container |
| `reception-desk-top` | Pens, business cards for Dr. Elena Bright | Flavor |
| `reception-desk-middle` | Staff schedule for gala week. "Night security sweeps: **3** per night (22:00, 01:00, 04:00). Cameras offline for maintenance until gala night, per M.W." | **Digit 3** (world fact: sweep count) |
| `reception-desk-bottom` | "Routine pre-gala code audit" notebook, first page: "Exhibition code is rebuilt from four house figures in walking order: Lobby, Gallery A, Archives, Vault Access. Lobby figure: the nightly sweeps. Gallery A figure: the loan. Remaining figures: see curator." | The Lobby lie (audit) + partial assembly rule |
| `visitor-log` | Entry: "E. Bright, Room 3-A, Catalog #**7734**, pull for gala review" | Catalog code |
| Phone Post-it (document) | "Gallery A key in the lobby flowers, per usual. E." | Key hint |
| `flower-arrangement` | Lilies and jasmine. Hidden: brass key tagged "Gallery A Access" | Yields `gallery-a-key` (hidden item, take via `use_item`) |

### Room 2: Gallery A - Renaissance Wing

| Object | Canonical text | Purpose |
|---|---|---|
| `display-case-west` | Placard: "Renaissance Jewelry Collection. Loaned by the Wexler Foundation. **8** pieces on display. Please see curator for Vault storage protocols." | **Digit 8** (world fact: loan piece count) |
| `painting-landscape` | Pastoral landscape, "Gift of the Belmont Estate, 1973" | Red herring |
| `velvet-rope` | Brass stanchion and burgundy rope | Red herring |
| `archives-door` | Locked brass door, "Staff Only" | Opens with `gallery-a-key` |

### Room 3: Archives Room

| Object / drawer | Canonical text | Purpose |
|---|---|---|
| `filing-cabinet-north` | Oak cabinet, drawers A-D, E-H, I-L, M-P; J-L slightly ajar | Container |
| `filing-j-l` | Loan agreements J to L. Wexler Foundation loan agreement, "Clause **9**: the Foundation may substitute a certified display replica for any insured piece without notice." Sticky note in Elena's hand: "Clause 9. This is how he would do it. E.B." | **Digit 9** (world fact: clause number) + foreshadows the twist |
| `card-catalog` | Wooden catalog chest; drawer "7734" carries a small lock symbol | Code target |
| `card-catalog-7734` (locked until `enter_code 7734`) | Catalog card 7734: Sunburst Diamond, 45.2 ct, fancy vivid yellow. Back, in Elena's hand: "If you are reading this, M. has already asked for the display copy two weeks early. Do not trust the pedestal. My keycard opens the curator hold on the shelves. The code is the house figures in walking order, Lobby first: sweeps, loan pieces, the clause, the level. E.B." | **Elena reveal + assembly confirmation** |
| `hidden-painting` | Hinged seascape; door outline behind it | `pull` reveals and unlocks `vault-access` |
| `desk-lamp` | "To Elena, For Late Nights - M" | Red herring (and a nudge that M. is close to Elena) |

### Room 4: Vault Access Corridor

| Object | Canonical text | Purpose |
|---|---|---|
| `blueprint-frame` | Museum floor plan. Vault and Vault Access Corridor marked "Sub-Level **1** (B1)" | **Digit 1** (world fact: the level) |
| `maintenance-locker` | Cleaning supplies, a flashlight, and a keycard on a lanyard: "Curator: Dr. Elena Bright" | Yields `curator-keycard` (*new* hidden item) |
| `vault-keypad` | 4-digit keypad, "ENTER CODE:" | Accepts `3891` |

### Room 5: The Vault

| Object | Canonical text | Purpose |
|---|---|---|
| `pedestal-diamond` (*new id*, display name "The Sunburst Diamond on a pedestal") | A dazzling yellow stone under glass. On close examination the girdle carries a laser inscription: "WF DISPLAY COPY". | **Twist: it is the replica.** Not takeable; any take attempt returns the inscription. |
| `steel-shelves` | Numbered steel shelves. One case is tagged "Curator hold - E.B." with a keycard reader. With `curator-keycard` in inventory, examining reveals the authentic Sunburst Diamond. | Yields `sunburst-diamond` (*new* hidden item, requires `curator-keycard`) |
| `environmental-controls` | 68F, 45%, "System Normal" | Red herring |

## 5. Canonical live path (tool calls)

Examiner = MCP agent. Operator = phone (drawers and codes only). Either role can technically call any tool; the split below is what the demo and hints assume.

```
R1  Examiner  look_around
    Examiner  examine_object poster-board                 (cameras lie)
    Operator  open_drawer reception-desk-middle           (3 sweeps)
    Operator  open_drawer reception-desk-bottom           (walking order)
    Examiner  examine_object visitor-log                  (7734)
    Examiner  examine_object flower-arrangement
    Examiner  use_item gallery-a-key take
    Examiner  use_item gallery-a open                     (unlock + move in one step)
R2  Examiner  examine_object display-case-west            (8 pieces)
    Examiner  use_item archives open
R3  Operator  enter_code 7734 target=card-catalog         (Elena reveal)
    Operator  open_drawer filing-j-l                      (clause 9)
    Examiner  use_item hidden-painting pull               (vault-access unlocked)
    Examiner  use_item vault-access open
R4  Examiner  examine_object blueprint-frame              (Sub-Level 1)
    Examiner  examine_object maintenance-locker
    Examiner  use_item curator-keycard take               (BEFORE the code)
    Operator  enter_code 3891 target=vault-keypad         (auto-move to R5)
R5  Examiner  examine_object pedestal-diamond             (replica)
    Examiner  examine_object steel-shelves                (keycard hold)
    Examiner  use_item sunburst-diamond take              (authentic secured, win)
```

## 6. Info split (LOCKED)

| | Examiner (agent, MCP) | Operator (human, phone) |
|---|---|---|
| Briefing | `get_briefing`: cover story **and** classified note (Elena vs. M., verify authenticity, trust the shelves over the pedestal) | Phone tips: red-team audit before the gala. No mention of Elena's suspicion. |
| Reads | placards, blueprint, catalog card, examine results | drawer contents (schedule, notebook, loan clause) via phone alerts |
| Acts | take, unlock, open doors, pull painting | open drawers, enter codes |
| Knows the twist first | yes, from the briefing and the 7734 card | no, learns it on the Stage when the pedestal is examined |

## 7. Stage feedback expectations

Action ticker rows are `{player} {result}` from the Worker's action log. The Stage-Juice layer (Module C) classifies rows into toasts by the `action` column. What each beat should show:

| Beat | Ticker result (LIVE string) | Toast / effect (Module C) |
|---|---|---|
| Examiner joins | `Examiner joined as examiner` | "Examiner joined" |
| Operator joins | `<name> joined as operator` | "<name> joined" |
| Key taken | `Examiner took the gallery-a-key` | "Gallery A Key acquired", pickup juice, inventory panel gains a row |
| Drawer opened | `<name> opened reception-desk-middle` | "Reception Desk Middle opened" |
| Gallery door | `Examiner unlocked the gallery-a door with the gallery-a-key` then `Examiner moved to Gallery A` | "Gallery A unlocked", unlock juice, "Entering Gallery A" |
| Catalog code | `Unlocked catalog drawer 7734` | "Code accepted" |
| Wrong code | `Incorrect code` | "Code rejected" (error tone) |
| Painting | `Examiner swung the painting aside, revealing the Vault Access door` | ticker only (action `move_painting` is not classified); host narrates |
| Keypad | `<name> entered correct vault code` | "Vault open", success juice, climax ribbon stage 1 |
| Keycard taken | `Examiner took the curator-keycard` | "Curator Keycard acquired" |
| Authentic stone | `Examiner took sunburst-diamond` | "Sunburst Diamond secured", climax ribbon stage 2 (heist complete) |

## 8. Cross-module constraints

Things the Seed and Logic modules must honor so the docs and Stage stay true:

1. Replica ids and messages must **not** contain the word "diamond" as the take subject (use `pedestal-diamond` as the object but make it non-takeable), otherwise Module C fires "heist complete" on the fake. Only the authentic item is named `sunburst-diamond`.
2. `curator-keycard` and `sunburst-diamond` follow the hidden-item pattern already used for `gallery-a-key` (found by `examine_object`, taken by `use_item ... take`). `sunburst-diamond` requires `curator-keycard` in inventory.
3. `enter_code 3891` keeps auto-moving the team to room 5, so the keycard warning in the docs stays valid. If Logic adds a `vault -> vault-access` return exit, remove the warning from both docs.
4. The `7734` catalog text is Elena's note (section 4), not "This is the complete 4-digit code obtained by combining room digits 3-8-9-1".
5. `get_briefing` carries the classified note; the Operator phone tips and Stage start screen carry only the cover story.
6. Hints may point at the object holding a fact ("the schedule in the middle drawer") but never state a digit.

## 9. Retired fiction (delete on sight)

UV flashlight, Ada Lovelace / 1815, "Exhibition Hall", "Conservation Room", "Director's Office", maintenance key, 1847 gallery count, drawer #101 / #201, "Room N digit is X" labels.
