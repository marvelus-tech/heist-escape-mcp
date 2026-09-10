# Story Seed Manifest: Diamonds Through the Ages

Source of truth for names in `packages/mcp-server/seed.sql`. The Logic module (game-session.ts / mcp-server.ts) should hook these exact ids. Spoilers throughout.

## Story in one paragraph

Cover: a two-person red-team hired by curator Dr. Elena Bright for a closed-door security walkthrough the night before the gala **Diamonds Through the Ages**. Lobby lie: cameras are on a "maintenance window" and the desk notebook is a "routine keypad audit". Archives reveal (catalog card 7734): Elena muted the cameras herself; her patron Marcus Wexler ("M") gave her the lamp, the loan and the keypad sequence and knows the four marks; do not trust the pedestal, trust the path behind the painting. Finale: the pedestal Sunburst is a laser-inscribed REPLICA; the authentic stone sits in the Wexler loan case on the steel shelves, opened by the curator keycard from the corridor maintenance locker.

## Codes (unchanged)

| Puzzle | Code | Where the code comes from |
|---|---|---|
| Card catalog drawer | `7734` | `visitor-log` (lobby) |
| Vault keypad | `3891` | Four marks in walking order: Lobby 3, Gallery 8, Archives 9, Corridor 1 |

No clue text ever says "Room N digit is X" and nothing prints `3891`. The only numerals in player-facing text are the four marks (each confined to its own room) and `7734`.

## Mark sources (one per room)

| Room | Mark | Object / drawer | Language |
|---|---|---|---|
| 1 Lobby | 3 | drawer `reception-desk-middle` | Gala staff schedule: Sunburst crate routes through **LOAN BAY 3** |
| 2 Gallery A | 8 | object `display-case-west`, doc `Gallery Placard` | Wexler Foundation Loan, **Agreement No. 8** |
| 3 Archives | 9 | drawer `filing-j-l` | Misfiled folder tab: WEXLER / SUNBURST, **Loan File 9** |
| 4 Vault Access | 1 | object `blueprint-frame`, doc `Blueprint Title Block` | **Revision 1**, all prior revisions withdrawn |

Assembly rule is stated softly (walking order: reception, gallery, archives, corridor) in: `poster-board` note, drawer `reception-desk-bottom` notebook, `vault-keypad` tape, `Red-Team Briefing`, and the 7734 card.

## Canonical exit names

`gallery-a`, `archives`, `vault-access`, `vault` (matches merged pitch-path #4). `lobby` appears only as a back-exit from room 2.

Data change: room 5 `exits` is now `vault-access` (was `none`) so the team can step back into the corridor for the keycard. The current runtime already treats exits to lower-numbered rooms as open, so this works with no code change.

## Objects by room

Existing names are unchanged so Stage/three.js positions and Operator drawer buttons keep working. New rows are marked.

### Room 1 Lobby
| name | takeable | container | role |
|---|---|---|---|
| `reception-desk` | no | yes | security monitor shows CAMERAS: MAINTENANCE WINDOW (the lie); drawers below |
| `visitor-log` | yes | no | "M. Wexler, after hours, Vault Access, escorted by E.B." and "Archives, Catalog #7734, hold for red-team" |
| `poster-board` | no | no | walking-order rule, "everything is in the paperwork" |
| `flower-arrangement` | no | no | hides `gallery-a-key` (runtime HIDDEN_ITEMS, unchanged) |

Drawers: `reception-desk-top` (unsent gala invitation to Marcus), `reception-desk-middle` (**mark 3**, loan bay), `reception-desk-bottom` (audit notebook: where each area keeps its mark, no digits).

### Room 2 Gallery A
| name | role |
|---|---|
| `display-case-west` | **mark 8**, Loan Agreement No. 8, Lender: Marcus Wexler |
| `painting-landscape` | Wexler crumb (reframed courtesy of the Foundation) |
| `archives-door` | flavor; same brass key |
| `velvet-rope` | flavor (patron table reserved for the Wexler party) |

### Room 3 Archives
| name | container | role |
|---|---|---|
| `filing-cabinet-north` | yes | drawer `filing-j-l` holds **mark 9** on the misfiled Wexler folder |
| `desk-lamp` | no | "To Elena, For Late Nights. M." |
| `card-catalog` | yes | target for `enter_code 7734`; drawer `card-catalog-7734` (locked=1) holds Elena's reveal |
| `hidden-painting` | no | `pull` reveals `vault-access` (runtime unchanged); frame note "Trust this path. E." |

### Room 4 Vault Access Corridor
| name | takeable | container | role |
|---|---|---|---|
| `vault-keypad` | no | no | `enter_code 3891`, "Four marks, walking order" |
| `blueprint-frame` | no | no | **mark 1**, Revision 1 |
| `security-camera` (new) | no | no | maintenance tag authorized by E. Bright, no end time |
| `maintenance-locker` | no | yes | drawer `maintenance-locker-shelf` (new, unlocked) describes the keycard |
| `curator-keycard` (new) | **yes** | no | opens the loan case reader in the vault |

### Room 5 The Vault
| name | takeable | container | role |
|---|---|---|---|
| `sunburst-diamond` | yes | no | REPLICA. Takeable so the twist can land; examine text and `Registrar Tag (pedestal)` mark it as the display copy |
| `steel-shelves` | no | yes | Wexler loan case with keycard reader; drawer `steel-shelves-loan-case` (new, locked=1) |
| `sunburst-diamond-authentic` (new) | **yes** | no | the real objective; Elena's card inside |
| `environmental-controls` | no | no | log: vault camera OFFLINE by E. Bright; loan case last opened by badge M. WEXLER |

## Puzzle rows

| room | puzzle_type | solution_hash | unlocks_what |
|---|---|---|---|
| 1 | `keycard` | `gallery-a-key` | `gallery-a` |
| 3 | `catalog-access` | `7734` | `card-catalog-7734` |
| 4 | `vault-code` | `3891` | `vault` |
| 5 | `curator-keycard` (new) | `curator-keycard` | `steel-shelves-loan-case` |

The new row mirrors the existing `gallery-a-key` row: an item-name "solution" that Logic can look up when the keycard is used, rather than a typed code.

## Expected player path (happy path, 5 to 10 minutes)

1. Lobby: `open_drawer reception-desk-middle` (Bay 3). `examine_object flower-arrangement`, `use_item take gallery-a-key`, `use_item open gallery-a`.
2. Gallery: `examine_object display-case-west` (Agreement No. 8). `use_item open archives`.
3. Archives: `open_drawer filing-j-l` (Loan File 9). `enter_code 7734 target card-catalog`, `open_drawer card-catalog-7734` (reveal). `use_item hidden-painting pull`, `use_item open vault-access`.
4. Corridor: `examine_object blueprint-frame` (Revision 1). `open_drawer maintenance-locker-shelf`, `use_item take curator-keycard`. `enter_code 3891 target vault-keypad` (auto-moves to vault).
5. Vault: `examine_object sunburst-diamond` (REPLICA). `use_item curator-keycard use target steel-shelves`. `use_item take sunburst-diamond-authentic`. Done.

If the keycard was missed: `use_item open vault-access` from the vault, take it, `use_item open vault` to return.

## What Logic needs to wire (not done in this PR; no TypeScript changed)

1. **Keycard on shelves**: `use_item { itemName: 'curator-keycard', action: 'use'|'unlock', target: 'steel-shelves' }` while in room 5 and holding the card should `addSolvedPuzzle('steel-shelves-loan-case')` (so `open_drawer steel-shelves-loan-case` succeeds) and return the puzzle row's `success_message`. Without the card, return its `failure_message`.
2. **Gate the authentic stone**: `take sunburst-diamond-authentic` should require `steel-shelves-loan-case` solved. Today the runtime honors `is_takeable` only, so the stone is takeable immediately.
3. **Victory condition**: `sunburst-diamond-authentic` in inventory, not `sunburst-diamond`. Taking the replica should be allowed and should read as a near-miss (Stage juice / climax hooks in #5 should key on the authentic id).
4. **Hardcoded 7734 message leak**: `game-session.ts` `enterCode` returns a hardcoded string containing "Vault exhibition code: 3891" for `7734`. Replace with the puzzle row's `success_message` (or the drawer contents). Same for the hardcoded `3891` success string; prefer the DB row so flavor follows the seed.
5. **Optional**: read `objects.locked` (already in schema) for `steel-shelves` / `sunburst-diamond-authentic` instead of hardcoding, if a generic "locked object" mechanic is wanted.

## Killed content

UV light, Lovelace, Exhibition Hall, 1847 and the "Vault code digit for Room N" notes are gone. `docs/SOLUTION_GUIDE.md` still describes the old digit notes and should be regenerated by the Integrator once Logic lands.
