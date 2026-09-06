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
 */
export function createHeistMcpServer(env: Env): McpServer {
  const server = new McpServer({
    name: "heist-escape-mcp",
    version: "1.0.0",
  });

  // ===== Session Management Tools =====
  
  server.tool(
    "join_session",
    z.object({
      sessionId: z.string().describe("Session ID to join (e.g., 'heist-alpha')"),
      playerName: z.string().describe("Your player name"),
      role: z.string().optional().describe("Optional role: 'examiner' or 'operator'")
    }),
    async ({ sessionId, playerName, role }) => {
      const id = env.GAME_SESSION.idFromName(sessionId);
      const stub = env.GAME_SESSION.get(id);
      const result = await stub.joinSession(playerName, playerName, role);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  );
  
  server.tool(
    "get_state",
    z.object({
      sessionId: z.string().describe("Session ID")
    }),
    async ({ sessionId }) => {
      const id = env.GAME_SESSION.idFromName(sessionId);
      const stub = env.GAME_SESSION.get(id);
      const state = await stub.getState();
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(state, null, 2)
          }
        ]
      };
    }
  );
  
  server.tool(
    "get_recent_actions",
    z.object({
      sessionId: z.string().describe("Session ID"),
      limit: z.number().optional().describe("Number of recent actions (default 10)")
    }),
    async ({ sessionId, limit }) => {
      const id = env.GAME_SESSION.idFromName(sessionId);
      const stub = env.GAME_SESSION.get(id);
      const actions = await stub.getRecentActions(limit || 10);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ actions }, null, 2)
          }
        ]
      };
    }
  );
  
  // ===== Exploration Tools =====
  
  server.tool(
    "look_around",
    z.object({
      sessionId: z.string().describe("Session ID"),
      playerId: z.string().describe("Your player ID/name")
    }),
    async ({ sessionId, playerId }) => {
      const id = env.GAME_SESSION.idFromName(sessionId);
      const stub = env.GAME_SESSION.get(id);
      const result = await stub.lookAround(playerId);
      
      return {
        content: [
          {
            type: "text",
            text: `**${result.room.name}**\n\n${result.room.description}\n\n*${result.room.atmosphere}*\n\n**Visible Objects:**\n${result.objects.map(o => `- ${o.name}: ${o.short_description}`).join('\n')}\n\n**Exits:** ${result.exits.join(', ') || 'none'}\n**Can progress:** ${result.canProgress ? 'Yes (some doors unlocked)' : 'No (find keys/codes first)'}`
          }
        ]
      };
    }
  );
  
  server.tool(
    "examine_object",
    z.object({
      sessionId: z.string().describe("Session ID"),
      playerId: z.string().describe("Your player ID/name"),
      objectName: z.string().describe("Name of object to examine (e.g., 'reception-desk')")
    }),
    async ({ sessionId, playerId, objectName }) => {
      const id = env.GAME_SESSION.idFromName(sessionId);
      const stub = env.GAME_SESSION.get(id);
      
      try {
        const result = await stub.examineObject(playerId, objectName);
        
        let text = `**${result.object.name}**\n\n${result.object.full_description}`;
        
        if (result.object.interaction_hints) {
          text += `\n\n*Hint: ${result.object.interaction_hints}*`;
        }
        
        if (result.specialInfo) {
          text += `\n\n🔍 **Discovery:** ${result.specialInfo}`;
        }
        
        return {
          content: [{ type: "text", text }]
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }]
        };
      }
    }
  );
  
  // ===== Interaction Tools =====
  
  server.tool(
    "use_item",
    z.object({
      sessionId: z.string().describe("Session ID"),
      playerId: z.string().describe("Your player ID/name"),
      itemName: z.string().describe("Item or object name"),
      action: z.enum(["take", "use", "open", "unlock", "press", "pull"]).describe("Action to perform"),
      target: z.string().optional().describe("Target object (for unlock/use actions)")
    }),
    async ({ sessionId, playerId, itemName, action, target }) => {
      const id = env.GAME_SESSION.idFromName(sessionId);
      const stub = env.GAME_SESSION.get(id);
      const result = await stub.useItem(playerId, itemName, action, target);
      
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
      
      return {
        content: [{ type: "text", text }]
      };
    }
  );
  
  server.tool(
    "open_drawer",
    z.object({
      sessionId: z.string().describe("Session ID"),
      playerId: z.string().describe("Your player ID/name"),
      drawerId: z.string().describe("Drawer ID (e.g., 'reception-desk-bottom')")
    }),
    async ({ sessionId, playerId, drawerId }) => {
      const id = env.GAME_SESSION.idFromName(sessionId);
      const stub = env.GAME_SESSION.get(id);
      const result = await stub.openDrawer(playerId, drawerId);
      
      if (result.success) {
        return {
          content: [
            {
              type: "text",
              text: `**Drawer Contents:**\n\n${result.contents}`
            }
          ]
        };
      } else {
        return {
          content: [{ type: "text", text: result.message }]
        };
      }
    }
  );
  
  server.tool(
    "enter_code",
    z.object({
      sessionId: z.string().describe("Session ID"),
      playerId: z.string().describe("Your player ID/name"),
      code: z.string().describe("Code to enter"),
      target: z.string().optional().describe("Target (e.g., 'vault-keypad', 'card-catalog')")
    }),
    async ({ sessionId, playerId, code, target }) => {
      const id = env.GAME_SESSION.idFromName(sessionId);
      const stub = env.GAME_SESSION.get(id);
      const result = await stub.enterCode(playerId, code, target);
      
      let text = result.message;
      
      if (result.unlocked) {
        text += `\n\n🎉 **${result.unlocked}** unlocked!`;
      }
      
      if (result.roomChanged) {
        text += `\n\n📍 Moved to room ${result.roomChanged}. Use look_around to survey the new area.`;
      }
      
      return {
        content: [{ type: "text", text }]
      };
    }
  );
  
  // ===== Team Coordination Tools =====
  
  server.tool(
    "get_inventory",
    z.object({
      sessionId: z.string().describe("Session ID")
    }),
    async ({ sessionId }) => {
      const id = env.GAME_SESSION.idFromName(sessionId);
      const stub = env.GAME_SESSION.get(id);
      const result = await stub.getInventory();
      
      if (result.items.length === 0) {
        return {
          content: [{ type: "text", text: "**Team Inventory:** Empty\n\nNo items collected yet." }]
        };
      }
      
      const text = `**Team Inventory:**\n\n${result.items.map(item => 
        `- **${item.item}** (taken by ${item.takenBy})`
      ).join('\n')}`;
      
      return {
        content: [{ type: "text", text }]
      };
    }
  );
  
  server.tool(
    "get_hints",
    z.object({
      sessionId: z.string().describe("Session ID"),
      playerId: z.string().describe("Your player ID/name"),
      roomId: z.number().optional().describe("Room number (defaults to current room)")
    }),
    async ({ sessionId, playerId, roomId }) => {
      const id = env.GAME_SESSION.idFromName(sessionId);
      const stub = env.GAME_SESSION.get(id);
      const result = await stub.getHints(playerId, roomId);
      
      const text = `**Hints for Room ${roomId || '(current)'}:**\n\n${result.hints.map((hint, i) => 
        `${i + 1}. ${hint}`
      ).join('\n\n')}\n\n*Hints used: ${result.hintsUsedInRoom}/${result.totalAvailable}*`;
      
      return {
        content: [{ type: "text", text }]
      };
    }
  );

  return server;
}
