import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { Env } from "./types";

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
        role: z.string().optional().describe("Optional role: 'examiner' or 'operator'")
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
  
  // ===== Agent Briefing =====
  
  server.registerTool(
    "get_briefing",
    {
      description: "Read the mission briefing for the Examiner agent.",
      inputSchema: z.object({
        sessionId: z.string().describe("Session ID")
      })
    },
    async ({ sessionId }) => {
      const briefing = `# 🎯 Heist Escape - Mission Briefing

**Session ID**: ${sessionId}
**Your Role**: Examiner (Agent)
**Theme**: Light, professional museum heist

## Mission Objective
Your team's goal is to infiltrate the museum vault and retrieve the **Sunburst Diamond** 💎

The museum has 5 rooms:
1. **Museum Lobby** - Find the gallery key and first vault digit
2. **Gallery A** - Renaissance wing with second digit
3. **Archives** - Card catalog puzzle and third digit  
4. **Vault Access** - Assemble and enter the 4-digit code
5. **The Vault** - Claim the diamond

## Your Role: Examiner (Agent)
As the Examiner, your responsibilities are:
- **Read and analyze** documents, signs, and clues
- **Examine objects** closely for hidden information
- **Communicate findings** to your Operator partner
- **Navigate** the team through the museum

The Operator (human partner) will:
- Open drawers and containers
- Enter codes at keypads
- Manage the shared inventory
- Execute physical interactions

## 🔑 Critical Information

**Assembly Rule**: The 4-digit vault code is found across all 4 rooms.
**Combine digits in ORDER BY ROOM NUMBER** (Room 1 → Room 2 → Room 3 → Room 4)

## Suggested First Steps
1. \`join_session\` - Confirm your session: "${sessionId}"
2. \`look_around\` - Survey the Museum Lobby
3. \`examine_object\` - Check the "poster-board" for the assembly rule
4. \`examine_object\` - Search the "flower-arrangement" (key location)
5. Communicate with your Operator to coordinate drawer searches

## Available Tools
- \`look_around\` - Survey current room
- \`examine_object\` - Inspect objects for clues
- \`use_item\` - Take or use items (when you find them)
- \`get_inventory\` - Check shared team inventory
- \`get_hints\` - Request progressive hints if stuck
- \`get_recent_actions\` - See what your Operator has done

## Cooperative Guidelines
- **Share all findings** - Your Operator can't see what you read
- **Request specific actions** - "Please open reception-desk-bottom drawer"
- **Track digits** - Write down the vault code as you find each piece
- **Work together** - Neither role can succeed alone

## Light Theme Note
This heist takes place in a **bright, welcoming museum** with:
- Natural daylight through tall windows
- Polished marble floors and white walls
- Professional, calm atmosphere
- Warm wood tones and brass fixtures

This is an elegant professional operation, not a dark infiltration.

## Success Metrics
- Time to complete: 30-45 minutes (full game) or 5-10 minutes (pitch demo)
- Hints used: Fewer is better, but don't get stuck
- Team coordination: Clear communication = faster success

**Good luck, Agent. Your team is counting on you.** 🕵️

---
*Use \`look_around\` to begin your mission.*`;
      
      return textResult(briefing);
    }
  );

  return server;
}
