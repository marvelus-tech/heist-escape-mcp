# Heist Escape - Complete Solution Guide

**⚠️ SPOILER WARNING: This guide contains all puzzle solutions. For operators only!**

---

## Game Overview

The Heist Escape is a 5-room cooperative museum heist requiring 2 players to work together. Players share inventory and must communicate to solve puzzles and reach the vault.

**Completion Time:** 30-45 minutes (full game) | 5-10 minutes (pitch path)

---

## Room 1: Museum Lobby

### Objective
Find the first vault code digit and the key to Gallery A.

### Puzzle 1: Find Gallery A Key
1. Examine `flower-arrangement`
2. Use `use_item` with action `take` to collect `gallery-a-key`
3. Key is added to shared inventory

### Puzzle 2: First Vault Digit
1. Open drawer: `open_drawer` with `reception-desk-bottom`
2. Read contents: "Code audit: Room 1 = **3**"
3. Note: This is digit 1 of 4 for the vault code

### Hidden Clues
- **poster-board**: Assembly rule reminder ("ORDER BY ROOM NUMBER")
- **visitor-log**: References catalog #7734 (needed in Room 3)
- **phone Post-it**: Hint about key location

### Exit Strategy
- Unlock: `use_item` with itemName `gallery-a-key`, action `unlock`, target `gallery-a`
- Move: `use_item` with action `open`, target `gallery-a` (moves the team to Room 2)
- Shortcut: `open` on a locked door works in one step if the team already holds the matching key

**Room 1 Digit: 3**

---

## Room 2: Gallery A - Renaissance Wing

### Objective
Find the second vault code digit.

### Puzzle: Display Case Clue
1. Examine `display-case-west`
2. Read the note card: "The vault code digit for Room 2 is: **8**"

### Additional Content
- **painting-landscape**: Atmospheric flavor
- **velvet-rope**: Standard museum barrier
- **archives-door**: Locked; the brass `gallery-a-key` from Room 1 opens it too

### Exit Strategy
- `use_item` with action `open`, target `archives` (or `archives-door`) while holding `gallery-a-key`
- Moves the team to Room 3

**Room 2 Digit: 8**

---

## Room 3: Archives Room

### Objective
Find the third vault code digit and access the catalog drawer.

### Puzzle 1: Filing Cabinet Digit
1. Open drawer: `open_drawer` with `filing-j-l`
2. Contents reveal: "Vault code digit for Room 3: **9**"

### Puzzle 2: Card Catalog Access
1. Remember visitor log from Room 1: catalog #**7734**
2. Use `enter_code` with code `7734` and target `card-catalog`
3. Drawer unlocks revealing: "Vault exhibition code: **3891**"
4. This is the COMPLETE 4-digit vault code (assembled from all 4 rooms)
5. `open_drawer` with `card-catalog-7734` now succeeds (it stays locked until the code is entered)

### Hidden Content
- **hidden-painting**: Conceals vault access door
- **desk-lamp**: Personal touch, no functional purpose

### Exit Strategy
- `use_item` with itemName `hidden-painting`, action `pull` reveals and unlocks `vault-access`
- `use_item` with action `open`, target `vault-access` moves the team to Room 4

**Room 3 Digit: 9**

---

## Room 4: Vault Access Corridor

### Objective
Find the fourth vault code digit and enter the complete code.

### Puzzle 1: Blueprint Digit
1. Examine `blueprint-frame`
2. Read fine print: "Vault code digit for Room 4: **1**"

### Puzzle 2: Vault Keypad
1. Assemble the code from all 4 rooms:
   - Room 1: **3**
   - Room 2: **8**
   - Room 3: **9**
   - Room 4: **1**
2. Combined code: **3891**
3. Use `enter_code` with code `3891` and target `vault-keypad`
4. Success message: Vault unlocks and players automatically move to Room 5

### Additional Objects
- **maintenance-locker**: Contains curator keycard (alternate path clue)

**Room 4 Digit: 1**
**Complete Vault Code: 3891**

---

## Room 5: The Vault

### Objective
Claim the Sunburst Diamond and complete the heist.

### Final Puzzle: Claim the Prize
1. Examine `sunburst-diamond`
2. Use `use_item` with action `take` on `sunburst-diamond`
3. **HEIST COMPLETE!**

### Victory Conditions
- Diamond successfully taken
- Action log shows completion
- Both players see victory state

---

## Cooperative Mechanics

### Shared Inventory
- Any item picked up by one player is visible to all
- Use `get_inventory` to see team items
- Examples: `gallery-a-key`, `sunburst-diamond`

### Roles (Optional)
1. **Examiner**: Reads documents, examines objects in detail
2. **Operator**: Opens drawers, enters codes, takes items

Roles are soft suggestions; both players can use all tools.

### Communication is Key
- Use `get_recent_actions` to see teammate's moves
- Action log shows all discoveries
- Progressive hints available via `get_hints` if stuck

---

## Red Herrings

These objects are atmospheric but don't contain puzzle solutions:
- **velvet-rope** (Room 2)
- **painting-landscape** (Room 2)
- **desk-lamp** (Room 3)
- **environmental-controls** (Room 5)
- **steel-shelves** (Room 5)

---

## Progressive Hints by Room

### Room 1
1. "The reception area often has useful information..."
2. "The poster board has a note about an assembly rule..."
3. "Look for digit clues in each room. The bottom desk drawer..."

### Room 2
1. "The archives door needs a key..."
2. "Display cases often have information cards..."
3. "The western display case has a hidden note card..."

### Room 3
1. "The visitor log mentioned catalog #7734..."
2. "The card catalog has a drawer labeled 7734..."
3. "Filing cabinet drawer J-L contains another digit..."

### Room 4
1. "You need a 4-digit code for the keypad..."
2. "The blueprint on the wall has text worth reading..."
3. "Combine the digits in room order: 3-8-9-1..."

### Room 5
1. "You've made it to the vault!..."
2. "Simply examine and take the Sunburst Diamond..."
3. "Victory is yours!..."

---

## Speedrun Strategy (5-10 minutes)

**Optimal Path:**
1. Room 1: Grab key, check desk bottom drawer (digit 3), `open` `gallery-a`
2. Room 2: Examine display case (digit 8), `open` `archives`
3. Room 3: Open J-L drawer (digit 9), enter 7734 at catalog, `pull` `hidden-painting`, `open` `vault-access`
4. Room 4: Check blueprint (digit 1), enter 3891 at keypad (auto-moves to Room 5)
5. Room 5: Take diamond

**No backtracking required if you remember digits!**

---

## Common Mistakes

1. **Forgetting to record digits**: Write them down as you find them
2. **Wrong code order**: Must be Room 1→2→3→4 (3891, not 1893)
3. **Missing catalog number**: Check visitor log in Room 1 for #7734
4. **Not sharing info**: Cooperative play requires communication!

---

## Technical Notes for Operators

- All puzzle solutions stored server-side (Durable Object + D1)
- Codes validated via `enter_code` tool
- No solutions in client JavaScript bundle
- Session state persists across disconnects
- Multiple sessions can run simultaneously

---

**End of Solution Guide**

Good luck, and may your heist be swift and silent! 💎
