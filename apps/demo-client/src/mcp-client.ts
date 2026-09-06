/**
 * MCP Client for Heist Escape
 * 
 * Handles communication with the MCP server via HTTP
 * (Note: For demo, using direct HTTP calls; production would use proper MCP client)
 */

export class MCPClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = 'http://localhost:8787') {
    this.baseUrl = baseUrl;
  }
  
  async joinSession(sessionId: string, playerName: string, role?: string): Promise<any> {
    return this.callTool('join_session', { sessionId, playerName, role });
  }
  
  async getState(sessionId: string): Promise<any> {
    return this.callTool('get_state', { sessionId });
  }
  
  async getRecentActions(sessionId: string, limit?: number): Promise<any> {
    return this.callTool('get_recent_actions', { sessionId, limit });
  }
  
  async lookAround(sessionId: string, playerId: string): Promise<any> {
    return this.callTool('look_around', { sessionId, playerId });
  }
  
  async examineObject(sessionId: string, playerId: string, objectName: string): Promise<any> {
    return this.callTool('examine_object', { sessionId, playerId, objectName });
  }
  
  async useItem(sessionId: string, playerId: string, itemName: string, action: string, target?: string): Promise<any> {
    return this.callTool('use_item', { sessionId, playerId, itemName, action, target });
  }
  
  async openDrawer(sessionId: string, playerId: string, drawerId: string): Promise<any> {
    return this.callTool('open_drawer', { sessionId, playerId, drawerId });
  }
  
  async enterCode(sessionId: string, playerId: string, code: string, target?: string): Promise<any> {
    return this.callTool('enter_code', { sessionId, playerId, code, target });
  }
  
  async getInventory(sessionId: string): Promise<any> {
    return this.callTool('get_inventory', { sessionId });
  }
  
  async getHints(sessionId: string, playerId: string, roomId?: number): Promise<any> {
    return this.callTool('get_hints', { sessionId, playerId, roomId });
  }
  
  private async callTool(tool: string, params: any): Promise<any> {
    // For demo: simulate MCP tool calls via a simple HTTP API
    // In production, use proper MCP client library
    
    const response = await fetch(`${this.baseUrl}/api/${tool}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      throw new Error(`MCP call failed: ${response.statusText}`);
    }
    
    return response.json();
  }
}
