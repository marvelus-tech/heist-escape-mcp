import { createMcpHandler } from "agents/mcp/server";
import { createHeistMcpServer, resolveBriefing } from "./mcp-server";
import { GameSession } from "./game-session";
import type { Env } from "./types";

/**
 * Heist Escape MCP Worker
 * 
 * Dual-surface Worker serving:
 * 1. MCP endpoint at /mcp (Streamable HTTP transport for MCP clients)
 * 2. REST API at /api/* (for three.js demo client)
 * 
 * Both surfaces talk to the same GameSession Durable Object for consistent state.
 */

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // ===== MCP Endpoint (Streamable HTTP) =====
    // For MCP clients: Claude Desktop, Cursor, mcp-remote, Inspector
    if (url.pathname === "/mcp") {
      const mcpHandler = createMcpHandler(() => createHeistMcpServer(env));
      return mcpHandler(request, env, ctx);
    }
    
    // ===== CORS Headers =====
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
    
    // ===== Health Check / Info Endpoint =====
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(
        JSON.stringify({
          name: "Heist Escape MCP Server",
          version: "1.0.0",
          description: "Cooperative escape-room ARG/heist game via MCP",
          endpoints: {
            "/": "Server info (this endpoint)",
            "/mcp": "MCP endpoint (Streamable HTTP) - connect MCP clients here",
            "/api/{tool}": "REST API for three.js demo client"
          },
          mcp_clients: [
            "Claude Desktop",
            "Cursor",
            "MCP Inspector (npx @modelcontextprotocol/inspector@latest)",
            "mcp-remote (npx mcp-remote http://localhost:8787/mcp)"
          ],
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
            "get_hints",
            "get_briefing"
          ],
          rooms: 5,
          cooperative: true,
          theme: "light"
        }, null, 2),
        { headers: corsHeaders }
      );
    }
    
    // ===== REST API Endpoints =====
    // For three.js demo client
    if (url.pathname.startsWith("/api/") && request.method === "POST") {
      const toolName = url.pathname.slice(5); // Remove "/api/"
      
      try {
        const params = await request.json() as Record<string, any>;
        const result = await handleRestToolCall(toolName, params, env);
        
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

/**
 * REST API Handler
 * 
 * Handles REST tool calls from the three.js demo client.
 * Calls the same GameSession DO methods as the MCP tools.
 */
async function handleRestToolCall(tool: string, params: Record<string, any>, env: Env): Promise<any> {
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
    
    case "get_briefing": {
      const { playerId, role, classified } = params;
      return await resolveBriefing(env, { sessionId, playerId, role, classified: classified === true || classified === 'true' });
    }
    
    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}

export { GameSession };
