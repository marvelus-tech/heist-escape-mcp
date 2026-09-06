# Heist Escape Demo Script

**Duration**: 5-10 minutes  
**Setup**: One host computer (big screen) + guests with phones

---

## Pre-Demo Setup (1 minute)

**What You Need**:
- **Host computer** with browser (projected to TV/monitor if possible)
- **MCP client** (Claude Desktop, Cursor, or mcp-remote) on the host computer
- **Guest phones** for QR scanning

**Before the audience arrives**:
1. Open the stage page: `https://<your-username>.github.io/heist-escape-mcp/`
2. Click **"Start Demo"** to create a session
3. Keep the screen visible for guests to see
4. **Set up the Examiner agent** on the host computer:
   - Open Claude Desktop/Cursor
   - Add the MCP server config (see below)
   - Test connection: Say "Join session X as Agent Examiner"

---

## The Room Demo Flow

### Part 1: The Stage (Host Screen)

**🖥️ Main Screen = Everyone's View**

The host computer is the **primary stage**. Guests watch HERE for:
- Live 3D room visualization
- Real-time action ticker (who did what)
- Shared inventory updates
- Door unlocks and room transitions

**Host's Role**:
- Narrator and facilitator
- Runs the Examiner agent (optional but recommended)
- Ends session when demo is complete

---

### Part 2: The Lobby (Guest Phones)

**📱 QR Code Onboarding**

Two QR codes are shown on the stage:

1. **Operator (Recommended)** – Phone controls
   - Big touch buttons for opening drawers
   - Code input panel
   - Compact action log and inventory
   - **Phone-optimized**: No heavy 3D, just controls

2. **Watch (Optional)** – Read-only mirror
   - Live action feed
   - Shared inventory
   - Player list
   - **Minimal**: Just for following along

**Guest Workflow**:
1. Scan the **Operator QR** with your phone
2. Enter your name when prompted
3. Watch the main screen for the 3D action
4. Use your phone to tap drawers and enter codes

---

## Demo Script (5 minutes)

### Opening (30 seconds)

**You (Host):**
> "You're all agents who broke into this art museum after hours. Your goal: reach the Director's Office vault on the top floor. But the building is locked down, and you'll need to solve puzzles to unlock each door."

**Show the stage screen:**
- QR codes prominently displayed
- "Session Active" banner with session ID

**Invite guests:**
> "Scan the Operator QR with your phone. You'll get touch controls. The main action happens here on the big screen."

---

### Act 1: Museum Lobby (2 minutes)

**Set the scene:**
> "We're starting in the Museum Lobby. There's a security desk, a statue, and a locked door to the Exhibition Hall. Let's explore."

**Action 1: The Examiner Agent (on host computer)**

**You (via Claude/Cursor MCP):**
> "Agent Examiner, join the session and look around."

**The agent will respond** with a description of the room, then:
> "Agent, examine the security desk."

**Stage updates**:
- Action ticker shows: `🕵️ Agent Examiner examined Security Desk`
- Agent finds: *"There's a logbook here with a suspicious entry..."*

**Action 2: Guest Participation (phones)**

**You (to guests):**
> "Someone, tap 'Open Drawer' on your phone. Try drawer #101."

**Stage updates**:
- Inventory toast pops up: *"Found: Maintenance Key"*
- Ticker shows: `📱 Guest opened Drawer #101 at Security Desk`

**Collaborative puzzle:**
> "Now we need a 4-digit code. Agent, search the logbook for clues."

**Agent reports**:
> *"The last entry says: 'System reset to gallery count.'"*

**You (narrating):**
> "There are 1847 paintings in the gallery. Let's try that. Guest, enter 1847 on your phone."

**Stage updates**:
- Door animation: Exhibition Hall door UNLOCKS
- Ticker: `✅ Exhibition Hall unlocked! Code 1847 accepted.`

---

### Act 2: Exhibition Hall (2 minutes)

**Transition:**
> "Agent, use the Maintenance Key to enter the Exhibition Hall."

**Stage updates**:
- 3D scene transitions to new room
- Room title changes: "Exhibition Hall"

**New exploration:**

**Agent:**
> "Agent, look around. What do you see?"

**Agent describes** paintings, a pedestal, a locked case.

**Guest action:**
> "Guest, open drawer #201. There's a UV flashlight inside."

**The payoff:**
> "Agent, examine the painting with the UV flashlight in inventory."

**Agent reveals**:
> *"Hidden message under UV: 'The artist's birth year is the code.'"*

**Research phase:**
> "Agent, check the plaque. Who's the artist?"

**Agent:**
> *"Painting by Ada Lovelace, 1815-1852."*

**Code entry (guest phone):**
> "Guest, enter 1815."

**Stage updates**:
- Conservation Room door unlocks
- Inventory shows UV Flashlight being used
- Ticker celebrates the team's progress

---

### Act 3: Speed Run (1 minute)

**Momentum:**
> "Let's see how fast you can clear the next rooms. Agent, take the lead. Guests, watch for code prompts."

**Quick sequence**:
1. **Conservation Room**: Decode message → unlock Archives
2. **Archives**: Combine items → unlock Director's Office
3. **Director's Office**: Final vault code

**Throughout**:
- Stage shows real-time updates
- Ticker moves fast
- Inventory fills up
- Agent and guests work in parallel

---

### Closing (30 seconds)

**Victory state:**
> "You've reached the vault! The Director's collection is yours."

**Stage displays**:
- Final room: Director's Office
- Full inventory displayed
- Action log recap scrolling

**Takeaway:**
> "This is a cooperative MCP game. The agent has knowledge and reasoning. Humans have tactile controls and intuition. Together, you escape."

---

## Post-Demo Q&A

**Common Questions**:

**Q: Can I play this remotely?**
> Yes! Share the join links instead of QR codes. The stage can be a shared screen on Zoom.

**Q: How do I set up my own MCP server?**
> See `docs/DEPLOY.md` for full instructions. You'll need a Cloudflare Workers account (free tier works).

**Q: Can I add my own puzzles?**
> Absolutely! Edit `packages/mcp-server/seed.sql` to add rooms, objects, and codes. Redeploy the Worker.

**Q: What if the agent gets stuck?**
> Use hints! Type: "Agent, get hint for puzzle_code_museum_1"

**Q: Can I use a different agent?**
> Yes! Any MCP client works: Claude Desktop, Cursor, Cline, mcp-remote, or custom clients.

---

## MCP Config for the Examiner Agent

Add this to your Claude Desktop or Cursor MCP config:

```json
{
  "mcpServers": {
    "heist-escape": {
      "url": "https://heist-escape-mcp.YOUR_ACCOUNT.workers.dev/mcp",
      "transport": "sse"
    }
  }
}
```

**Replace `YOUR_ACCOUNT`** with your Cloudflare Workers subdomain.

Then, in Claude/Cursor, say:
> "Join session ABC123 as Agent Examiner"

---

## Tips for a Great Demo

1. **Rehearse once** before the audience. Make sure the agent connects and the QR codes work.
2. **Keep it moving**: Don't let the agent overthink. Prompt it with direct questions.
3. **Celebrate team moments**: When the agent finds a clue and a guest enters the code, cheer!
4. **Use the stage**: Point at the screen when actions happen. Make it a show.
5. **Phones are companions**: Remind guests the main action is on the big screen.
6. **Pause for questions**: After each room unlock, ask if anyone has questions.

---

## Troubleshooting

**Agent won't connect?**
- Check MCP config URL
- Restart Claude Desktop
- Test with `mcp-remote list-tools` first

**QR codes don't scan?**
- Make sure they point to production URL (not localhost)
- Check `VITE_API_BASE` in `.env.production`
- Increase QR code size in `StagePage.ts` if needed

**Phone controls lag?**
- Normal with 2-second polling
- Can reduce polling interval in `OperatorPage.ts`

**Stage doesn't update?**
- Check browser console for API errors
- Verify Worker is deployed and D1 is seeded
- Refresh the page to reset

---

**Break a leg!** 🎭💎
