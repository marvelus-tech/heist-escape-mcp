# Heist Escape MCP

A cooperative escape-room ARG/heist game implemented as a remote MCP server on Cloudflare Workers, with a light-themed three.js demo client.

**Theme:** Bright, welcoming museum heist (not dark/cyberpunk)  
**Duration:** 5-10 minutes (pitch path) | 30-45 minutes (full game)  
**Players:** 2 (cooperative, shared state)  
**Rooms:** 5 interconnected spaces  
**Puzzles:** 4 code-based puzzles with progressive hints

---

## 🎯 Features

### MCP Server (Cloudflare Workers)
- **10 MCP Tools** for cooperative gameplay
- **Durable Objects** for session state (strong consistency)
- **D1 Database** for static game content (rooms, objects, puzzles)
- **Shared inventory** across all players
- **Action log** for team coordination
- **Progressive hints** per room

### Three.js Demo Client
- **Light-themed 3D dioramas** (bright rooms, soft lighting)
- **Raycast interaction** (click objects to examine)
- **CSS2D UI overlays** (inventory, action log, examine panel)
- **Real-time state sync** via MCP tools
- **Emissive pulses** on interactable objects

### Game Content
- **5 rooms**: Museum Lobby → Gallery A → Archives → Vault Access → The Vault
- **18 interactable objects** (desks, drawers, paintings, keypads, diamond)
- **4 code puzzles** (key finding, catalog access, 4-digit vault code)
- **Red herrings** and multi-stage puzzles
- **Complete solution guide** (docs only, not in client bundle)

---

## 🏗️ Architecture

```
heist-escape-mcp/
├── packages/
│   └── mcp-server/          # Cloudflare Worker + DO + D1
│       ├── src/
│       │   ├── index.ts     # Worker entry point
│       │   ├── mcp.ts       # McpAgent with 10 tools
│       │   ├── game-session.ts  # Durable Object
│       │   └── types.ts     # TypeScript definitions
│       ├── schema.sql       # D1 database schema
│       ├── seed.sql         # Game content (rooms, objects, puzzles)
│       └── wrangler.jsonc   # Worker config
├── apps/
│   └── demo-client/         # Vite + three.js client
│       ├── src/
│       │   ├── main.ts      # Entry point
│       │   ├── mcp-client.ts    # MCP tool wrapper
│       │   └── scene-manager.ts # 3D scene builder
│       ├── index.html       # Light-themed UI
│       └── vite.config.ts
├── docs/
│   ├── SOLUTION_GUIDE.md   # Complete walkthrough (spoilers!)
│   └── DEMO_SCRIPT.md      # 5-10 minute pitch script
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or pnpm
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account (for deployment)

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed Database
```bash
cd packages/mcp-server
npm run seed
```

This creates the D1 database locally and populates it with:
- 5 rooms with descriptions
- 18 interactable objects
- 4 puzzles with hashed solutions
- Progressive hints (3 per room)

### 3. Start MCP Server
```bash
cd packages/mcp-server
npm run dev
```

Server runs at `http://localhost:8787/mcp`

### 4. Start Demo Client (Optional)
```bash
cd apps/demo-client
npm run dev
```

Client runs at `http://localhost:3000`

### 5. Play the Game

#### Option A: MCP Clients (Recommended)

The server exposes a real MCP endpoint at `/mcp` using Streamable HTTP transport. Connect any MCP client:

**MCP Inspector** (easiest for testing):
```bash
npx @modelcontextprotocol/inspector@latest
# Open http://localhost:5173
# Connect to: http://localhost:8787/mcp
```

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "heist-escape": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:8787/mcp"]
    }
  }
}
```

Restart Claude Desktop after updating config.

**Cursor** (Settings → Features → Model Context Protocol):
```json
{
  "mcpServers": {
    "heist-escape": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:8787/mcp"]
    }
  }
}
```

**mcp-remote CLI**:
```bash
npx mcp-remote http://localhost:8787/mcp
```

#### Option B: Browser Client (Three.js Demo)
1. Open `http://localhost:3000`
2. Enter session ID: `heist-alpha`
3. Enter your player name
4. Select role (optional): `examiner` or `operator`
5. Click **Join Heist**
6. Click objects in the 3D scene to interact

#### Option C: Direct HTTP API (for testing)
#### Option D: Two MCP Agents (Best for Cooperative Demo)
Launch two MCP-enabled agents (Claude Desktop, Cursor, etc.) with the server connected:
```json
{
  "mcpServers": {
    "heist-escape": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:8787/mcp"]
    }
  }
}
```

Both agents join the same session and cooperate!

---

## 🎮 MCP Tools

### Session Management
1. **join_session** — Join or create a game session
   - Params: `sessionId`, `playerName`, `role?`
   - Returns: Welcome message + current state

2. **get_state** — Get full session state
   - Params: `sessionId`
   - Returns: Room, players, inventory, unlocks, hints used

3. **get_recent_actions** — View action log
   - Params: `sessionId`, `limit?`
   - Returns: Recent player actions for coordination

### Exploration
4. **look_around** — Survey current room
   - Params: `sessionId`, `playerId`
   - Returns: Room description, visible objects, exits

5. **examine_object** — Inspect an object closely
   - Params: `sessionId`, `playerId`, `objectName`
   - Returns: Detailed description, hidden clues, hints

### Interaction
6. **use_item** — Take or use an item/object
   - Params: `sessionId`, `playerId`, `itemName`, `action`, `target?`
   - Actions: `take`, `use`, `open`, `unlock`, `press`, `pull`
   - Returns: Result, inventory updates, unlocked doors

7. **open_drawer** — Open a specific drawer
   - Params: `sessionId`, `playerId`, `drawerId`
   - Returns: Drawer contents or lock status

8. **enter_code** — Enter a code/number
   - Params: `sessionId`, `playerId`, `code`, `target?`
   - Returns: Success/failure, unlocked content

### Team Coordination
9. **get_inventory** — View shared team inventory
   - Params: `sessionId`
   - Returns: All items collected by any player

10. **get_hints** — Request progressive hints
    - Params: `sessionId`, `playerId`, `roomId?`
    - Returns: Incremental hints (subtle → direct)

---

## 🎯 Cooperative Design

### Shared State
- **Inventory** is team-wide: if Alice picks up a key, Bob can use it
- **Action log** shows all player moves in real-time
- **Door unlocks** persist for all players
- **Puzzle solutions** are validated server-side only

### Roles (Optional)
- **Examiner**: Focuses on reading documents, examining objects
- **Operator**: Focuses on opening drawers, entering codes
- Both roles can use all tools; roles are soft suggestions

### Keep Talking Beat
Example: One player finds part of a code on a document, verbally shares it with the teammate who's at the keypad. Requires communication!

---

## 🧩 Game Walkthrough (No Spoilers)

### Pitch Path (5-10 minutes)
1. **Room 1 (Lobby)**: Find Gallery A key, discover first vault digit
2. **Room 2 (Gallery)**: Find second vault digit, unlock Archives
3. **Tease Room 3+**: Setup for catalog puzzle and final vault access

### Full Game (30-45 minutes)
- **Room 3 (Archives)**: Solve catalog puzzle, find third digit
- **Room 4 (Vault Access)**: Assemble 4-digit code, unlock vault
- **Room 5 (Vault)**: Claim the Sunburst Diamond, heist complete!

**For complete solutions, see [docs/SOLUTION_GUIDE.md](docs/SOLUTION_GUIDE.md) (spoilers!)**

---

## 📦 Deployment

### Deploy MCP Server to Cloudflare
```bash
cd packages/mcp-server

# Create D1 database (first time only)
wrangler d1 create heist-db
# Copy database_id to wrangler.jsonc

# Seed remote database
npm run seed:remote

# Deploy Worker
npm run deploy
```

Your MCP server will be at:
```
https://heist-escape-mcp.<your-account>.workers.dev/mcp
```

### Connect Remote MCP Server

**Claude Desktop**:
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

**Cursor / MCP Inspector**:
```
https://heist-escape-mcp.<your-account>.workers.dev/mcp
```

### Build Demo Client
```bash
cd apps/demo-client
npm run build
```

Static files in `dist/` can be deployed to:
- Cloudflare Pages
- Vercel
- Netlify
- Any static host

Update `vite.config.ts` proxy to point to your deployed MCP server.

---

## 🎨 Design Principles

### Light Theme (NOT Dark)
- **Rooms**: Bright, welcoming, professional museum spaces
- **Lighting**: Soft ambient + warm accents + cool highlights
- **UI**: Light backgrounds, dark text, clean sans-serif
- **Materials**: Marble, brass, glass, warm wood tones
- **Atmosphere**: Calm, elegant, sophisticated (not tense/dark)

### Puzzle Philosophy
- **Fair ARG**: All clues discoverable through exploration
- **No pixel hunting**: Objects clearly described and hinted
- **Progressive hints**: 3 levels per room (subtle → direct)
- **Server-side validation**: No puzzle solutions in client code
- **Red herrings**: Atmospheric objects that don't hold clues

### Accessibility
- Clear object descriptions
- Interaction hints on examine
- Progressive hint system
- Action log for team coordination
- No time pressure

---

## 🧪 Testing

### Local Development
```bash
# Terminal 1: MCP Server
cd packages/mcp-server
npm run seed && npm run dev

# Terminal 2: Demo Client
cd apps/demo-client
npm run dev

# Terminal 3: MCP Inspector
npx @modelcontextprotocol/inspector@latest
```

### Test Scenarios
1. **Solo Play**: One agent completes Rooms 1-2
2. **Cooperative Play**: Two agents join same session, share items
3. **Concurrent Sessions**: Two separate sessions running simultaneously
4. **State Persistence**: Disconnect and rejoin (state preserved)
5. **Invalid Codes**: Enter wrong vault code (should fail gracefully)

### Demo Script
See [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) for a complete 5-10 minute demo walkthrough with expected outputs.

---

## 🔧 Configuration

### Environment Variables (Optional)
None required for local development. For production:
- D1 database binding configured in `wrangler.jsonc`
- Durable Objects automatically provisioned

### Customization
- **Add rooms**: Extend `seed.sql` with new room data
- **Add objects**: Insert into `objects` table, update `SceneManager`
- **Add puzzles**: Insert into `puzzles` table with solution hash
- **Adjust difficulty**: Modify hint text, add/remove clues

---

## 📚 Documentation

- **[SOLUTION_GUIDE.md](docs/SOLUTION_GUIDE.md)** — Complete walkthrough with all puzzle solutions
- **[DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)** — 5-10 minute live demo script with expected outputs
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Technical architecture deep-dive (future)

---

## 🐛 Troubleshooting

### MCP Server Won't Start
- Check wrangler installed: `wrangler --version`
- Run database seed: `npm run seed`
- Check port 8787 not in use

### Database Empty
- Run `npm run seed` in `packages/mcp-server`
- Check for SQL errors in terminal output
- Verify D1 database created: `wrangler d1 list`

### Objects Not Interactable
- Use exact object names from `look_around` output
- Names are case-sensitive and use hyphens (e.g., `reception-desk`)
- Check current room with `get_state`

### Shared State Not Syncing
- Both players must use identical `sessionId`
- Durable Object ensures strong consistency
- Check action log: `get_recent_actions`

### Three.js Client Issues
- Check MCP server running: `curl http://localhost:8787/`
- Verify proxy config in `vite.config.ts`
- Open browser console for errors

---

## 🤝 Contributing

This is a demo project showcasing:
- Cloudflare Workers + Durable Objects + D1
- Remote MCP server architecture
- Cooperative stateful gameplay
- Light-themed three.js client

Feel free to:
- Add more rooms and puzzles
- Enhance 3D visualizations
- Improve UI/UX
- Add sound effects and music
- Create new game modes (competitive, time trial, etc.)

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🎓 Learning Resources

### Cloudflare
- [Durable Objects Docs](https://developers.cloudflare.com/durable-objects/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [Workers Best Practices](https://developers.cloudflare.com/workers/best-practices/)

### MCP
- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Building MCP Servers](https://modelcontextprotocol.io/docs/building-servers)

### Three.js
- [Three.js Documentation](https://threejs.org/docs/)
- [Three.js Examples](https://threejs.org/examples/)
- [Three.js Journey](https://threejs-journey.com/)

---

## 🙏 Acknowledgments

Built with:
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Three.js](https://threejs.org/)
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)

Inspired by:
- Classic escape room games
- ARG (Alternate Reality Game) design
- Cooperative puzzle-solving experiences
- "Keep Talking and Nobody Explodes" asymmetric cooperation

---

**Ready to pull off the heist of the century?** 💎

```bash
npm install
cd packages/mcp-server && npm run seed && npm run dev
```

Then follow the [DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) for your first playthrough!
