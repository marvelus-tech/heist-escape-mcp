import { GameSession } from "./game-session";
import type { Env } from "./types";

/**
 * Simple HTTP-based MCP-like API
 * 
 * Provides REST endpoints that wrap the game session Durable Object
 * This is a simplified approach that allows MCP clients to call tools via HTTP
 */

interface ToolCall {
  tool: string;
  params: Record<string, any>;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };
    
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Health check / info endpoint
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(
        JSON.stringify({
          name: "Heist Escape MCP Server",
          version: "1.0.0",
          description: "Cooperative escape-room ARG/heist game via MCP",
          endpoints: {
            "/": "Server info (this endpoint)",
            "/api/{tool}": "Call game tools via POST with JSON body"
          },
          tools: [
            "join_session",
            "get_state",
            "get_recent_actions",
            "look_around",
            "examine_object",
            "use_item",
            "open_drawer",
            "enter_code",
            "get_inventory",
            "get_hints"
          ],
          rooms: 5,
          cooperative: true,
          theme: "light"
        }, null, 2),
        { headers: corsHeaders }
      );
    }
    
    // API endpoints for tools
    if (url.pathname.startsWith("/api/") && request.method === "POST") {
      const toolName = url.pathname.slice(5); // Remove "/api/"
      
      try {
        const params = await request.json() as Record<string, any>;
        const result = await handleToolCall(toolName, params, env);
        
        return new Response(
          JSON.stringify(result, null, 2),
          { headers: corsHeaders }
        );
      } catch (error: any) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    return new Response("Not Found", { status: 404 });
  }
};

async function handleToolCall(tool: string, params: Record<string, any>, env: Env): Promise<any> {
  const sessionId = params.sessionId;
  
  if (!sessionId) {
    throw new Error("sessionId is required");
  }
  
  const id = env.GAME_SESSION.idFromName(sessionId);
  const stub = env.GAME_SESSION.get(id);
  
  switch (tool) {
    case "join_session": {
      const { playerName, role } = params;
      return await stub.joinSession(playerName, playerName, role);
    }
    
    case "get_state": {
      return await stub.getState();
    }
    
    case "get_recent_actions": {
      const { limit } = params;
      const actions = await stub.getRecentActions(limit || 10);
      return { actions };
    }
    
    case "look_around": {
      const { playerId } = params;
      return await stub.lookAround(playerId);
    }
    
    case "examine_object": {
      const { playerId, objectName } = params;
      return await stub.examineObject(playerId, objectName);
    }
    
    case "use_item": {
      const { playerId, itemName, action, target } = params;
      return await stub.useItem(playerId, itemName, action, target);
    }
    
    case "open_drawer": {
      const { playerId, drawerId } = params;
      return await stub.openDrawer(playerId, drawerId);
    }
    
    case "enter_code": {
      const { playerId, code, target } = params;
      return await stub.enterCode(playerId, code, target);
    }
    
    case "get_inventory": {
      return await stub.getInventory();
    }
    
    case "get_hints": {
      const { playerId, roomId } = params;
      return await stub.getHints(playerId, roomId);
    }
    
    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}

export { GameSession };
