# Heist Escape: Host Demo Script

**Runtime:** 5 to 10 minutes
**Setup:** one host laptop on the big screen (the Stage), the Examiner agent in an MCP client on that laptop, guests on phones as Operators.
**Story, ids and answers:** [`docs/redesign/COMBINED-PROGRAM.md`](redesign/COMBINED-PROGRAM.md). Full walkthrough: [`docs/SOLUTION_GUIDE.md`](SOLUTION_GUIDE.md).

The TV is the show. Guests look up at the Stage for the 3D room, the Live Actions ticker, the Shared Inventory panel and the toasts. Phones are controllers, not screens to stare at. Narrate to the TV, point at the TV, celebrate at the TV.

---

## What the audience is told vs. what the agent knows

- **Cover story (say this out loud):** "You are a security red-team hired to audit the museum before the *Diamonds Through the Ages* gala on Friday."
- **Classified (only the Examiner agent has it, via `get_briefing`):** Curator Elena Bright suspects trustee Marcus Wexler swapped the Sunburst Diamond for a replica. Verify the stone.

Do not spoil the classified part. Let the agent surface it and let the vault pay it off.

---

## Pre-demo setup (5 minutes, before guests arrive)

1. Open the Stage: `https://<your-username>.github.io/heist-escape-mcp/` (or `http://localhost:3000` in dev). Full screen it on the TV.
2. Have your MCP client (Claude Desktop, Cursor, or `mcp-remote`) open on the same laptop with this server configured:

```json
{
  "mcpServers": {
    "heist-escape": {
      "command": "npx",
      "args": ["mcp-remote", "https://heist-escape-mcp.<your-account>.workers.dev/mcp"]
    }
  }
}
```

   The Examiner page (`<stage-url>#/join?s=<SESSION>&role=examiner`) has a "Copy MCP Config" button with the right URL pre-filled if you would rather copy it.

3. Do one silent rehearsal run with the checklist at the bottom of this file. Then click **End Session** so the audience sees a fresh start.
4. Keep this script open on a second screen or phone. The only numbers you need: `7734`, `3891`.

---

## Beat 0: Start Demo (30 seconds)

**Do:** click **Start Demo** on the Stage.

**Stage shows:** the "Session Active" banner with a code like `demo-7K2Q`, the 3D Museum Lobby, two large QR codes (Operator, Watch), an empty Live Actions ticker ("Waiting for actions...") and an empty Shared Inventory ("No items collected yet").

**Say:**
> "Friday night this museum opens *Diamonds Through the Ages*. Tonight, we break in first. You are the security red-team. Your job is to get from this lobby to the vault and prove the Sunburst Diamond is safe. Two kinds of players: an AI agent that reads the room, and you, on your phones, with your hands on the drawers and keypads."

---

## Beat 1: Operator QR (45 seconds)

**Say:**
> "Scan the green Operator code. Type a name. You will get four drawer buttons and a code pad. Everything you do shows up on this screen."

**Do:** wait for two or three joins. Read their names off the ticker as they land.

**Stage shows:** ticker rows `<name> joined as operator`; toast "<name> joined".

Tip: one Operator is enough; three is lively; more than five and the drawer alerts get chaotic. Point latecomers at the Watch QR (read-only mirror).

---

## Beat 2: Examiner MCP join (45 seconds)

**Do (in your MCP client):**
> "Join heist session `demo-7K2Q` as `Examiner` with role `examiner`, then read the briefing and look around."

Use the exact session code from the banner; it is case-sensitive. The agent will call `join_session`, `get_briefing`, `look_around`.

**Stage shows:** `Examiner joined as examiner`, then `Examiner Surveyed Museum Lobby`.

**Say:**
> "Meet your Examiner. It just read a classified brief you do not have. It knows why we are really here. It cannot open a drawer or push a button. You cannot read a placard from your phone. Nobody finishes this alone."

---

## Beat 3: Lobby, flower key + schedule clue (90 seconds)

**Say:**
> "Look around. Cameras 'offline for maintenance'. A notebook that says 'routine code audit'. Convenient. Let's take the room apart."

**Operator (call it out):**
> "Someone tap **Reception Desk (Middle)**."

The phone alert reads the gala-week staff schedule: **3** night sweeps, cameras offline "per M.W."

**Say:**
> "Three sweeps a night. Hold that number. And note who signed off on the cameras: M.W."

**Operator:**
> "Now **Reception Desk (Bottom)**."

Audit notebook: the exhibition code is four house figures in walking order, Lobby first; Lobby figure is the sweeps, Gallery A figure is the loan, "remaining figures: see curator."

**Examiner:**
> "Examine the visitor log, then examine the flower arrangement and take whatever you find."

Visitor log: "E. Bright, Room 3-A, Catalog #7734." Flowers: brass key "Gallery A Access". Agent calls `use_item gallery-a-key take`.

**Stage shows:** toast "Gallery A Key acquired", the Shared Inventory panel gets its first row, ticker `Examiner took the gallery-a-key`.

**Examiner:**
> "Open the Gallery A door."

**Stage shows:** `Examiner unlocked the gallery-a door with the gallery-a-key`, `Examiner moved to Gallery A`, toasts "Gallery A unlocked" and "Entering Gallery A", camera shake.

**Say:**
> "First figure: 3. A catalog number: 7734. A key. Into the gallery."

---

## Beat 4: Gallery placard (45 seconds)

**Examiner:**
> "Examine the west display case and read me the placard."

Placard: Renaissance Jewelry Collection, loaned by the Wexler Foundation, **8** pieces on display.

**Say:**
> "Wexler Foundation. Eight pieces on loan. The notebook said the Gallery figure is 'the loan'. Second figure: 8. Anyone want to bet what M.W. stands for?"

**Examiner:**
> "Open the Archives door with the same key."

**Stage shows:** "Archives unlocked", "Entering Archives".

---

## Beat 5: Archives, 7734 + Elena's reveal (90 seconds)

**Operator:**
> "Code pad. Type **7734**, target **Card Catalog**, submit."

**Stage shows:** ticker `Unlocked catalog drawer 7734`, toast "Code accepted".

**Examiner:**
> "Read card 7734 to the room."

Read the back of the card slowly, this is the story beat:
> "If you are reading this, M. has already asked for the display copy two weeks early. Do not trust the pedestal. My keycard opens the curator hold on the shelves. The code is the house figures in walking order, Lobby first: sweeps, loan pieces, the clause, the level. E.B."

**Say:**
> "Elena Bright. The curator. She hired us, and she thinks Marcus Wexler swapped her diamond. She just told us the order of the code and where to look when we get there. Two more figures: 'the clause' and 'the level'."

**Operator:**
> "Tap **Filing Cabinet (J-L)**."

Loan agreement, Clause **9**: the Foundation may substitute a certified display replica without notice. Elena's sticky: "This is how he would do it."

**Say:**
> "Clause 9. That is the legal cover for a swap. Third figure: 9."

### Beat 5b: The painting (20 seconds)

**Examiner:**
> "Pull the large seascape painting."

**Stage shows:** ticker `Examiner swung the painting aside, revealing the Vault Access door`. No toast fires for this action, so sell it yourself:

**Say:**
> "Behind the painting: a door marked Vault Access. Of course there is."

**Examiner:** "Open Vault Access." Stage: "Entering Vault Access".

---

## Beat 6: Keypad 3891 (60 seconds)

**Examiner:**
> "Examine the blueprint, then examine the maintenance locker and take the keycard."

Blueprint: Vault on Sub-Level **1**. Locker: lanyard keycard "Curator: Dr. Elena Bright".

**Stage shows:** toast "Curator Keycard acquired", inventory now has two rows.

**Say:**
> "Fourth figure: the level, 1. And Elena's keycard, exactly where she said we would need it. Do not enter the code until that keycard is in the bag. The vault door is one-way."

**Say (to the room):**
> "Walking order. Sweeps, loan, clause, level. Call it out."

Let the guests assemble it: **3 8 9 1**.

**Operator:**
> "Type **3891**, target **Vault Keypad**, submit."

**Stage shows:** ticker `<name> entered correct vault code`, toast "Vault open", success juice, climax ribbon stage one. The team is moved into the Vault automatically.

If someone fat-fingers it: ticker `Incorrect code`, red toast "Code rejected". Laugh, try again.

---

## Beat 7: Vault twist (45 seconds)

**Say:**
> "There it is. The Sunburst Diamond, on the pedestal, under glass. Job done?"

**Examiner:**
> "Examine the diamond on the pedestal. Closely."

Inscription on the girdle: **"WF DISPLAY COPY"**.

**Say:**
> "Wexler Foundation display copy. That is a replica. If we had grabbed it and gone home, Wexler walks, Elena gets blamed, and the gala opens with a fake on the pedestal. Elena said: do not trust the pedestal. Trust the shelves."

---

## Beat 8: Authentic secure (30 seconds)

**Examiner:**
> "Examine the steel shelves with the curator keycard, then take the Sunburst Diamond."

Shelves: a case tagged "Curator hold - E.B." with a keycard reader; the reader accepts Elena's card; the authentic stone is inside. Agent calls `use_item sunburst-diamond take`.

**Stage shows:** toast "Sunburst Diamond secured", climax ribbon stage two, ticker `Examiner took sunburst-diamond`, inventory shows `sunburst-diamond`.

**Say:**
> "Authentic Sunburst, secured. Elena was right, Wexler is done, and none of that happens unless an agent that can read and humans that can act work the same room at the same time. That is the game."

**Do:** leave the climax ribbon on screen while you take questions. Click **End Session** when you are done.

---

## Timing cheat sheet

| Beat | Target | Running total |
|---|---|---|
| 0 Start Demo | 0:30 | 0:30 |
| 1 Operator QR | 0:45 | 1:15 |
| 2 Examiner join | 0:45 | 2:00 |
| 3 Lobby | 1:30 | 3:30 |
| 4 Gallery | 0:45 | 4:15 |
| 5 Archives + painting | 1:50 | 6:05 |
| 6 Keypad | 1:00 | 7:05 |
| 7 Twist | 0:45 | 7:50 |
| 8 Secure | 0:30 | 8:20 |

Running long? Skip the J-L drawer narration (just say "clause 9") and the blueprint (just say "sub-level 1"). Never skip the keycard.

---

## Stage feedback reference

What each action produces on the Stage. Ticker rows are `player` + `result` polled every two seconds; toasts come from the Stage juice layer.

| Action | Ticker | Toast / effect |
|---|---|---|
| Join | `X joined as operator` | "X joined" |
| Drawer | `X opened reception-desk-middle` | "Reception Desk Middle opened" |
| Take key | `Examiner took the gallery-a-key` | "Gallery A Key acquired", pickup pulse, inventory row |
| Door | `Examiner unlocked the gallery-a door...`, `Examiner moved to Gallery A` | "Gallery A unlocked", shake, "Entering Gallery A" |
| 7734 | `Unlocked catalog drawer 7734` | "Code accepted" |
| Wrong code | `Incorrect code` | "Code rejected" (red) |
| Painting | `Examiner swung the painting aside...` | ticker only |
| 3891 | `X entered correct vault code` | "Vault open", climax ribbon 1 |
| Keycard | `Examiner took the curator-keycard` | "Curator Keycard acquired" |
| Win | `Examiner took sunburst-diamond` | "Sunburst Diamond secured", climax ribbon 2 |

---

## Q&A crib

- **Remote guests?** Copy Link under either QR and paste it in chat; share the Stage over video.
- **Own server?** `docs/DEPLOY.md`. Free Cloudflare tier is enough.
- **Own puzzles?** Edit `packages/mcp-server/seed.sql` and redeploy. Keep the story bible in sync.
- **Agent stuck?** "Get a hint for the current room." Hints point at objects, never digits.
- **Other agents?** Anything that speaks MCP: Claude Desktop, Cursor, Cline, `mcp-remote`.

---

## Troubleshooting

- **Agent cannot connect:** check the `/mcp` URL in the config, restart the client, test with `npx mcp-remote <url>`.
- **Agent joined the wrong session:** the code is case-sensitive; read it off the banner again.
- **Phones cannot scan:** QR must point at the production URL (`VITE_API_BASE` in `.env.production`), not localhost.
- **Ticker is quiet:** two-second polling, give it a beat. Then check the Worker is deployed and D1 is seeded.
- **Entered 3891 before the keycard:** the vault is one-way. End Session, Start Demo, run it again from the top (it is fast).
- **Stage stopped updating:** refresh the page; session state lives on the server.

---

## Host rehearsal checklist

Run once, silently, before guests arrive.

- [ ] Stage loads full screen; Start Demo mints a `demo-XXXX` session and shows both QR codes
- [ ] Operator QR scans on a phone; join shows on the ticker
- [ ] Examiner joins from the MCP client with the exact session code; `get_briefing` mentions Elena Bright and Marcus Wexler
- [ ] Reception Desk (Middle) shows 3 sweeps; Reception Desk (Bottom) shows walking order
- [ ] Visitor log shows 7734; flowers yield `gallery-a-key`; "Gallery A Key acquired" toast fires
- [ ] `open gallery-a` moves the team; placard shows 8 pieces; `open archives` works with the same key
- [ ] `7734` at Card Catalog unlocks and reads Elena's note; Filing Cabinet (J-L) shows clause 9
- [ ] `pull hidden-painting` reveals Vault Access; `open vault-access` moves the team
- [ ] Blueprint shows Sub-Level 1; locker yields `curator-keycard` and the toast fires
- [ ] `3891` at Vault Keypad shows "Vault open" and moves the team to the Vault
- [ ] Pedestal examine shows "WF DISPLAY COPY"; take attempt is refused
- [ ] Steel shelves examine with keycard reveals the stone; `take sunburst-diamond` shows "Sunburst Diamond secured" and the climax ribbon
- [ ] End Session resets to the start screen
