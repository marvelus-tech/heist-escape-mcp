# Heist Escape - Live Pitch Demo Script

**Duration:** 5-10 minutes  
**Participants:** 2 agents (or 1 agent + 1 human)  
**Objective:** Demonstrate cooperative gameplay, shared state, and the core game loop

---

## Pre-Demo Setup

### 1. Start MCP Server
```bash
cd packages/mcp-server
npm run seed        # Initialize D1 database
npm run dev         # Start Wrangler dev server on :8787
```

### 2. Start Demo Client (Optional)
```bash
cd apps/demo-client
npm run dev         # Start Vite dev server on :3000
```

### 3. Session Details
- **Session ID**: `heist-alpha`
- **Player 1**: `Agent Alice` (Examiner role)
- **Player 2**: `Agent Bob` (Operator role)

---

## Act 1: Join Session & Lobby (2 minutes)

### Player 1 (Examiner) Joins
```
Tool: join_session
Params:
  sessionId: "heist-alpha"
  playerName: "Agent Alice"
  role: "examiner"
```

**Expected Output:**
```json
{
  "success": true,
  "message": "Agent Alice joined the heist!",
  "state": {
    "currentRoom": 1,
    "players": [{"name": "Agent Alice", "role": "examiner"}],
    "inventory": []
  }
}
```

### Player 2 (Operator) Joins
```
Tool: join_session
Params:
  sessionId: "heist-alpha"
  playerName: "Agent Bob"
  role: "operator"
```

**Expected Output:**
```json
{
  "success": true,
  "message": "Agent Bob joined the heist!",
  "state": {
    "currentRoom": 1,
    "players": [
      {"name": "Agent Alice", "role": "examiner"},
      {"name": "Agent Bob", "role": "operator"}
    ]
  }
}
```

### Both Players Look Around
```
Tool: look_around
Params:
  sessionId: "heist-alpha"
  playerId: "Agent Alice"
```

**Expected Output:**
```
**Museum Lobby**

A bright, sunlit lobby with polished marble floors...

*Warm morning light streams through floor-to-ceiling windows...*

**Visible Objects:**
- reception-desk: A polished mahogany reception desk
- visitor-log: A leather-bound visitor log
- poster-board: A promotional poster board
- flower-arrangement: A large floral arrangement

**Exits:** gallery-a
**Can progress:** No (find keys/codes first)
```

**🎭 Demo Note:** Point out the light, welcoming atmosphere (not dark/gritty).

---

## Act 2: Cooperative Discovery (3 minutes)

### Alice (Examiner) Reads Briefing
```
Tool: examine_object
Params:
  sessionId: "heist-alpha"
  playerId: "Agent Alice"
  objectName: "poster-board"
```

**Expected Output:**
```
**poster-board**

A corkboard displays colorful posters...
Preview - See briefing for assembly rule: ORDER BY ROOM NUMBER

💡 Hint: The sticky note mentions an assembly rule...
```

**🎭 Alice announces:** "The vault code is assembled from digits in each room, ordered by room number!"

### Bob (Operator) Opens Desk Drawer
```
Tool: open_drawer
Params:
  sessionId: "heist-alpha"
  playerId: "Agent Bob"
  drawerId: "reception-desk-bottom"
```

**Expected Output:**
```
**Drawer Contents:**

Emergency procedures binder, first aid kit, and a small notebook
with "Code audit: Room 1 = 3" written on the first page
```

**🎭 Bob announces:** "Found the first digit: **3**"

### Alice Discovers the Key
```
Tool: examine_object
Params:
  sessionId: "heist-alpha"
  playerId: "Agent Alice"
  objectName: "flower-arrangement"
```

**Expected Output:**
```
**flower-arrangement**

A stunning arrangement of white lilies and jasmine...

🔍 **Discovery:** Searching through the flowers, you find a brass key
attached to a tag reading 'Gallery A Access'! (Use use_item to take it)
```

### Alice Takes the Key
```
Tool: use_item
Params:
  sessionId: "heist-alpha"
  playerId: "Agent Alice"
  itemName: "gallery-a-key"
  action: "take"
```

**Expected Output:**
```
You carefully extract the brass key from the flowers...

✅ **gallery-a-key** added to shared team inventory
```

### Bob Checks Inventory (Shared State Demo)
```
Tool: get_inventory
Params:
  sessionId: "heist-alpha"
```

**Expected Output:**
```
**Team Inventory:**

- **gallery-a-key** (taken by Agent Alice)
```

**🎭 Demo Note:** Bob sees Alice's pickup immediately - shared state!

---

## Act 3: Unlock & Progress (2 minutes)

### Bob Uses the Shared Key
```
Tool: use_item
Params:
  sessionId: "heist-alpha"
  playerId: "Agent Bob"
  itemName: "gallery-a-key"
  action: "unlock"
  target: "archives-door"
```

**Expected Output:**
```
The brass key fits perfectly! The Archives door swings open silently.

🚪 **archives** is now unlocked!
```

**🎭 Demo Note:** Bob uses Alice's key - cooperative inventory sharing!

### Both Players Move to Room 2
```
Tool: use_item
Params:
  sessionId: "heist-alpha"
  playerId: "Agent Alice"
  itemName: "archives-door"
  action: "open"
  target: "gallery-a"
```

**Expected Output:**
```
Moving to gallery-a...

📍 Moved to room 2. Use look_around to survey the new area.
```

### Look Around Room 2
```
Tool: look_around
Params:
  sessionId: "heist-alpha"
  playerId: "Agent Alice"
```

**Expected Output:**
```
**Gallery A - Renaissance Wing**

An elegant gallery with cream-colored walls...

**Visible Objects:**
- display-case-west: A glass display case
- painting-landscape: A large pastoral landscape painting
- archives-door: A locked brass door

**Exits:** lobby, archives
```

### Alice Finds Second Digit
```
Tool: examine_object
Params:
  sessionId: "heist-alpha"
  playerId: "Agent Alice"
  objectName: "display-case-west"
```

**Expected Output:**
```
**display-case-west**

The case contains Renaissance-era jewelry...
One small note card: "The vault code digit for Room 2 is: 8"
```

**🎭 Alice announces:** "Second digit: **8**. So far we have 3-8..."

---

## Act 4: Tease Room 3+ (1 minute)

### Check Recent Actions (Cooperation Log)
```
Tool: get_recent_actions
Params:
  sessionId: "heist-alpha"
  limit: 5
```

**Expected Output:**
```json
{
  "actions": [
    {
      "player": "Agent Alice",
      "action": "examine",
      "result": "Examined display-case-west",
      "timestamp": 1234567890
    },
    {
      "player": "Agent Bob",
      "action": "unlock",
      "result": "Bob unlocked the archives door",
      "timestamp": 1234567880
    },
    ...
  ]
}
```

**🎭 Demo Note:** Both players see the full action history.

### Get Hints (Optional)
```
Tool: get_hints
Params:
  sessionId: "heist-alpha"
  playerId: "Agent Bob"
  roomId: 2
```

**Expected Output:**
```
**Hints for Room 2:**

1. The archives door needs a key. You may have found it in the previous room.
2. Display cases often have information cards. Examine them carefully.

*Hints used: 2/3*
```

---

## Closing Notes (30 seconds)

### What We Demonstrated
1. ✅ **Cooperative Join**: Two agents in one session
2. ✅ **Shared Inventory**: Key taken by Alice, used by Bob
3. ✅ **Shared State**: Both see action log and inventory updates
4. ✅ **Progressive Puzzles**: Assembly rule + digit collection
5. ✅ **Light Theme**: Bright museum, not dark/cyberpunk
6. ✅ **MCP Tools**: All actions via MCP server tools

### Remaining Rooms (Not Shown)
- **Room 3**: Card catalog puzzle (enter code 7734), third digit (9)
- **Room 4**: Vault keypad, enter full code (3891)
- **Room 5**: Claim the Sunburst Diamond, heist complete!

### Full Playthrough
- **Pitch Path**: 5-10 minutes (Rooms 1-2)
- **Complete Game**: 30-45 minutes (all 5 rooms)

---

## Live Demo Checklist

- [ ] MCP server running (`npm run dev`)
- [ ] D1 database seeded (`npm run seed`)
- [ ] Two MCP clients ready (agents or MCP Inspector)
- [ ] Session ID prepared (`heist-alpha`)
- [ ] Talking points: cooperation, shared state, light theme
- [ ] Solution guide ready (for hints if demo gets stuck)
- [ ] Three.js client running (optional visual companion)

---

## Browser Client Demo (Optional)

If demoing the three.js client:
1. Open `http://localhost:3000` in two browser tabs
2. Both enter session ID `heist-alpha`
3. Click objects in the 3D scene to examine
4. Show inventory updates in real-time
5. Demonstrate light-themed dioramas

**Visual Highlights:**
- Bright marble floors, white walls
- Soft lighting (hemisphere + directional)
- Clean UI panels (light backgrounds, dark text)
- Emissive pulse on interactable objects
- CSS2D overlays for inventory/examine

---

## Troubleshooting

### MCP Server Not Responding
- Check `wrangler dev` is running
- Verify D1 database seeded successfully
- Test with `curl http://localhost:8787/` (should return server info)

### Objects Not Found
- Run `npm run seed` again to reset database
- Check object names match exactly (case-sensitive)
- Use `look_around` to see available objects

### Shared State Not Syncing
- Both players must use the same `sessionId`
- Durable Object ensures strong consistency
- Check action log with `get_recent_actions`

---

**End of Demo Script**

Break a leg! 🎭💎
