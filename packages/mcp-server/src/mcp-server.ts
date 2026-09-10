import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { Env, BriefingAudience } from "./types";

// ===== Dual Briefing =====
//
// Operator / watch (and anyone unspecified) get the COVER story: a sanctioned red-team run before the
// "Diamonds Through the Ages" gala. The Examiner (or classified=true) gets the TRUE mission from Elena.
// Roles are soft: nothing here blocks any tool; it only changes what the briefing says.

export interface BriefingRequest {
  sessionId: string;
  playerId?: string;
  role?: string;
  classified?: boolean;
}

export interface Briefing {
  audience: BriefingAudience;
  classified: boolean;
  text: string;
}

/** Normalise a free-text role into a briefing audience. Unknown roles default to the cover story. */
export function toAudience(role?: string | null): BriefingAudience {
  const r = (role || '').trim().toLowerCase();
  if (r === 'examiner' || r === 'agent' || r === 'analyst') return 'examiner';
  if (r === 'watch' || r === 'spectator' || r === 'stage' || r === 'audience') return 'watch';
  return 'operator';
}

/**
 * Resolve which briefing a caller should see. Explicit `role` wins, then the role the player joined
 * with, then the cover story. `classified: true` forces the true mission regardless of role.
 */
export async function resolveBriefing(env: Env, req: BriefingRequest): Promise<Briefing> {
  let role = req.role;
  if (!role && req.playerId) {
    const stub = env.GAME_SESSION.get(env.GAME_SESSION.idFromName(req.sessionId));
    role = await stub.getPlayerRole(req.playerId);
  }
  const audience = toAudience(role);
  const classified = req.classified === true || audience === 'examiner';
  return {
    audience,
    classified,
    text: classified ? classifiedBriefing(req.sessionId, audience) : coverBriefing(req.sessionId, audience)
  };
}

const TOOL_LIST = `## Available Tools
- \`look_around\` - Survey current room
- \`examine_object\` - Inspect objects for clues and hidden items
- \`use_item\` - Take items, unlock/open doors, use a key or keycard on something
- \`open_drawer\` / \`enter_code\` - Drawers and keypads
- \`get_inventory\` / \`get_state\` - Shared team state
- \`get_hints\` - Progressive hints if stuck
- \`get_recent_actions\` - See what your partner has done`;

function coverBriefing(sessionId: string, audience: BriefingAudience): string {
  const roleLine = audience === 'watch'
    ? '**Your Role**: Observer (watch feed)'
    : '**Your Role**: Operator (hands)';
  return `# Bright Museum Trust - Red-Team Engagement Brief

**Session ID**: ${sessionId}
${roleLine}
**Classification**: Cover / unclassified

## Engagement
The Bright Museum Trust has contracted your team for an authorised physical security audit ahead of the
**Diamonds Through the Ages** gala. Management wants proof that the vault can be reached before the
press does. Curator Dr. Elena Bright signed the engagement letter. You have a window of one closed morning.

## Objective
Move from the Lobby to the Vault and demonstrate that the **Sunburst Diamond** on the pedestal could be
lifted. Log every control that fails along the way. Leave the building as you found it.

## The Building (5 rooms)
1. **Museum Lobby** - reception desk, visitor log, a key somewhere handy
2. **Gallery A** - Renaissance wing, Archives door
3. **Archives** - card catalog, filing cabinets, a large seascape
4. **Vault Access Corridor** - keypad door, blueprint, maintenance locker
5. **The Vault** - pedestal, steel shelves, environmental controls

## Assembly Rule
Staff hid one keypad digit in each of rooms 1 to 4 for the audit. **Combine them in ORDER BY ROOM NUMBER.**

## Working with your partner
The Examiner reads and analyses; you open, enter, take and move. Neither role can finish alone, and
nothing stops you from examining things yourself if you are curious. Share what you find.

${TOOL_LIST}

---
*Start with \`look_around\`. The client is watching the clock.*`;
}

function classifiedBriefing(sessionId: string, audience: BriefingAudience): string {
  return `# EYES ONLY - Sunburst Recovery

**Session ID**: ${sessionId}
**Your Role**: Examiner (${audience === 'examiner' ? 'primary' : 'cleared'})
**Classification**: Classified. The Operator has been given the red-team cover story. Keep it that way
unless you decide they need to know.

## What is actually happening
Dr. Elena Bright, curator, hired you off the books. She believes **Marcus** (the "M" who signs her
gifts, and the man who controls vault security) plans to **swap the Sunburst Diamond for a replica during
the gala** and walk the real stone out through secure storage. She could not go to the board; Marcus sits
on it. So she built you a path instead.

## What Elena has done for you
- Muted the corridor cameras and logged it as maintenance.
- Left a breadcrumb in the visitor log (a catalog number) that leads to a note in the Archives.
- Left her curator keycard where a curator would never leave it.

## Your real objectives
1. Reach the vault. The keypad code is not written down anywhere as a whole; assemble it from the
   four room marks using the lobby's assembly rule. Marcus already knows the sequence; you must earn it.
2. **Verify authenticity.** The stone on the pedestal may be a decoy. Examine it before you trust it.
3. If it is a replica, find where the authentic stone has been staged. Elena's note will point you at
   the **steel shelves**. Her keycard opens what Marcus locked.
4. Secure the **authentic** Sunburst Diamond. Taking the pedestal stone alone reads as success to
   everyone watching, and that is exactly what Marcus is counting on.

## Win condition
\`get_state\` reports \`heistComplete: "authentic"\`. \`"replica"\` means you have been played.

## Elena's words
*"Doubt the pedestal. Trust the painting."*

## Working with your Operator
They see the cover story. You can ask them to open drawers, enter codes and take items without telling
them why. Or tell them. Your call.

${TOOL_LIST}

---
*Start with \`look_around\`. Read everything. Nobody is going to hand you the number.*`;
}

/**
 * MCP Server Factory
 * 
 * Creates a fresh stateless MCP server for each request.
 * Each tool handler calls into the GameSession Durable Object for stateful operations.
 * 
 * This follows the modern Cloudflare MCP pattern with SDK v2:
 * - Server is created fresh per request (no shared state leakage)
 * - Game state lives in GameSession DO (persistent, consistent)
 * - Tools are registered with Zod schemas for validation
 * 
 * NOTE: SDK v2 (`@modelcontextprotocol/server`) removed `server.tool()`.
 * Tools must be registered with `server.registerTool(name, config, handler)`.
 */
export function createHeistMcpServer(env: Env): McpServer {
  const server = new McpServer({
    name: "heist-escape-mcp",
    version: "1.0.0",
  });

  const getSession = (sessionId: string) => {
    const id = env.GAME_SESSION.idFromName(sessionId);
    return env.GAME_SESSION.get(id);
  };

  const textResult = (text: string) => ({
    content: [{ type: "text" as const, text }]
  });

  // ===== Session Management Tools =====
  
  server.registerTool(
    "join_session",
    {
      description: "Join (or rejoin) a heist session. Call this first.",
      inputSchema: z.object({
        sessionId: z.string().describe("Session ID to join (e.g., 'heist-alpha')"),
        playerName: z.string().describe("Your player name"),
        role: z.string().optional().describe("Optional role: 'examiner', 'operator' or 'watch' (decides which briefing you see)")
      })
    },
    async ({ sessionId, playerName, role }) => {
      const result = await getSession(sessionId).joinSession(playerName, playerName, role);
      return textResult(JSON.stringify(result, null, 2));
    }
  );
  
  server.registerTool(
    "get_state",
    {
      description: "Get the full shared session state (room, unlocked doors, inventory, players, recent actions).",
      inputSchema: z.object({
        sessionId: z.string().describe("Session ID")
      })
    },
    async ({ sessionId }) => {
      const state = await getSession(sessionId).getState();
      return textResult(JSON.stringify(state, null, 2));
    }
  );
  
  server.registerTool(
    "get_recent_actions",
    {
      description: "See what teammates (e.g. the Operator) have done recently.",
      inputSchema: z.object({
        sessionId: z.string().describe("Session ID"),
        limit: z.number().optional().describe("Number of recent actions (default 10)")
      })
    },
    async ({ sessionId, limit }) => {
      const actions = await getSession(sessionId).getRecentActions(limit || 10);
      return textResult(JSON.stringify({ actions }, null, 2));
    }
  );
  
  // ===== Exploration Tools =====
  
  server.registerTool(
    "look_around",
    {
      description: "Survey the current room: description, visible objects and exits.",
      inputSchema: z.object({
        sessionId: z.string().describe("Session ID"),
        playerId: z.string().describe("Your player ID/name")
      })
    },
    async ({ sessionId, playerId }) => {
      const result = await getSession(sessionId).lookAround(playerId);
      const objects = result.objects.map(o => `- ${o.name}: ${o.short_description}`).join('\n');
      return textResult(
        `**${result.room.name}**\n\n${result.room.description}\n\n*${result.room.atmosphere}*\n\n**Visible Objects:**\n${objects}\n\n**Exits:** ${result.exits.join(', ') || 'none'}\n**Can progress:** ${result.canProgress ? 'Yes (some doors unlocked)' : 'No (find keys/codes first)'}`
      );
    }
  );
  
  server.registerTool(
    "examine_object",
    {
      description: "Inspect an object in the current room closely for clues and hidden items.",
      inputSchema: z.object({
        sessionId: z.string().describe("Session ID"),
        playerId: z.string().describe("Your player ID/name"),
        objectName: z.string().describe("Name of object to examine (e.g., 'reception-desk')")
      })
    },
    async ({ sessionId, playerId, objectName }) => {
      try {
        const result = await getSession(sessionId).examineObject(playerId, objectName);
        
        let text = `**${result.object.name}**\n\n${result.object.full_description}`;
        
        if (result.object.interaction_hints) {
          text += `\n\n*Hint: ${result.object.interaction_hints}*`;
        }
        
        if (result.specialInfo) {
          text += `\n\n🔍 **Discovery:** ${result.specialInfo}`;
        }
        
        return textResult(text);
      } catch (error: any) {
        return textResult(`Error: ${error.message}`);
      }
    }
  );
  
  // ===== Interaction Tools =====
  
  server.registerTool(
    "use_item",
    {
      description: "Take an item, use/unlock a door with a key, open an unlocked door to move rooms, or pull/press an object.",
      inputSchema: z.object({
        sessionId: z.string().describe("Session ID"),
        playerId: z.string().describe("Your player ID/name"),
        itemName: z.string().describe("Item or object name (e.g., 'gallery-a-key')"),
        action: z.enum(["take", "use", "open", "unlock", "press", "pull"]).describe("Action to perform"),
        target: z.string().optional().describe("Target door/object (e.g., 'gallery-a' for unlock/open actions)")
      })
    },
    async ({ sessionId, playerId, itemName, action, target }) => {
      const result = await getSession(sessionId).useItem(playerId, itemName, action, target);
      
      let text = result.message;
      
      if (result.itemAdded) {
        text += `\n\n✅ **${result.itemAdded}** added to shared team inventory`;
      }
      
      if (result.doorUnlocked) {
        text += `\n\n🚪 **${result.doorUnlocked}** is now unlocked!`;
      }
      
      if (result.roomChanged) {
        text += `\n\n📍 Moved to room ${result.roomChanged}. Use look_around to survey the new area.`;
      }
      
      if (result.heistComplete === 'authentic') {
        text += `\n\n💎 **HEIST COMPLETE.** The authentic Sunburst Diamond is secured.`;
      } else if (result.heistComplete === 'replica') {
        text += `\n\n💎 **Objective secured?** Something about this stone is off. Examine it.`;
      }
      
      return textResult(text);
    }
  );
  
  server.registerTool(
    "open_drawer",
    {
      description: "Open a drawer and read its contents.",
      inputSchema: z.object({
        sessionId: z.string().describe("Session ID"),
        playerId: z.string().describe("Your player ID/name"),
        drawerId: z.string().describe("Drawer ID (e.g., 'reception-desk-bottom')")
      })
    },
    async ({ sessionId, playerId, drawerId }) => {
      const result = await getSession(sessionId).openDrawer(playerId, drawerId);
      
      if (result.success) {
        return textResult(`**Drawer Contents:**\n\n${result.contents}`);
      }
      return textResult(result.message);
    }
  );
  
  server.registerTool(
    "enter_code",
    {
      description: "Enter a code at a keypad or locked drawer.",
      inputSchema: z.object({
        sessionId: z.string().describe("Session ID"),
        playerId: z.string().describe("Your player ID/name"),
        code: z.string().describe("Code to enter"),
        target: z.string().optional().describe("Target (e.g., 'vault-keypad', 'card-catalog')")
      })
    },
    async ({ sessionId, playerId, code, target }) => {
      const result = await getSession(sessionId).enterCode(playerId, code, target);
      
      let text = result.message;
      
      if (result.unlocked) {
        text += `\n\n🎉 **${result.unlocked}** unlocked!`;
      }
      
      if (result.roomChanged) {
        text += `\n\n📍 Moved to room ${result.roomChanged}. Use look_around to survey the new area.`;
      }
      
      return textResult(text);
    }
  );
  
  // ===== Team Coordination Tools =====
  
  server.registerTool(
    "get_inventory",
    {
      description: "List the shared team inventory.",
      inputSchema: z.object({
        sessionId: z.string().describe("Session ID")
      })
    },
    async ({ sessionId }) => {
      const result = await getSession(sessionId).getInventory();
      
      if (result.items.length === 0) {
        return textResult("**Team Inventory:** Empty\n\nNo items collected yet.");
      }
      
      return textResult(
        `**Team Inventory:**\n\n${result.items.map(item => `- **${item.item}** (taken by ${item.takenBy})`).join('\n')}`
      );
    }
  );
  
  server.registerTool(
    "get_hints",
    {
      description: "Request the next progressive hint for a room.",
      inputSchema: z.object({
        sessionId: z.string().describe("Session ID"),
        playerId: z.string().describe("Your player ID/name"),
        roomId: z.number().optional().describe("Room number (defaults to current room)")
      })
    },
    async ({ sessionId, playerId, roomId }) => {
      const result = await getSession(sessionId).getHints(playerId, roomId);
      
      return textResult(
        `**Hints for Room ${roomId || '(current)'}:**\n\n${result.hints.map((hint, i) => `${i + 1}. ${hint}`).join('\n\n')}\n\n*Hints used: ${result.hintsUsedInRoom}/${result.totalAvailable}*`
      );
    }
  );
  
  // ===== Agent Briefing (dual) =====
  
  server.registerTool(
    "get_briefing",
    {
      description: "Read the mission briefing. Operators/watchers get the red-team cover story; the Examiner (or classified=true) gets the true mission.",
      inputSchema: z.object({
        sessionId: z.string().describe("Session ID"),
        playerId: z.string().optional().describe("Your player ID/name; used to look up the role you joined with"),
        role: z.string().optional().describe("Override role: 'examiner' | 'operator' | 'watch'"),
        classified: z.boolean().optional().describe("Force the classified (true mission) briefing")
      })
    },
    async ({ sessionId, playerId, role, classified }) => {
      const briefing = await resolveBriefing(env, { sessionId, playerId, role, classified });
      return textResult(briefing.text);
    }
  );

  return server;
}
