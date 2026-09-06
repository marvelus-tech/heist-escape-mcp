import { DurableObject } from "cloudflare:workers";
import type { Env, SessionState, Player, Action, Room, GameObject, Drawer, Puzzle, Hint } from "./types";

/**
 * GameSession Durable Object
 * 
 * Manages shared state for a cooperative escape room session:
 * - Player roster and roles
 * - Shared inventory
 * - Room progression
 * - Puzzle state
 * - Action log for cooperation
 * 
 * Uses SQLite storage for persistence and strong consistency.
 */
export class GameSession extends DurableObject<Env> {
  
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    
    // Initialize SQLite schema for session state
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS session_state (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS players (
          player_id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          role TEXT,
          joined_at INTEGER NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS inventory (
          item_name TEXT PRIMARY KEY,
          picked_up_by TEXT NOT NULL,
          picked_up_at INTEGER NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS action_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER NOT NULL,
          player TEXT NOT NULL,
          action TEXT NOT NULL,
          target TEXT,
          result TEXT NOT NULL
        );
      `);
      
      // Initialize default state if new session
      const existing = this.ctx.storage.sql.exec(
        "SELECT value FROM session_state WHERE key = 'current_room'"
      ).one();
      
      if (!existing) {
        this.ctx.storage.sql.exec(
          "INSERT INTO session_state (key, value) VALUES ('current_room', '1')"
        );
        this.ctx.storage.sql.exec(
          "INSERT INTO session_state (key, value) VALUES ('unlocked_doors', '[]')"
        );
        this.ctx.storage.sql.exec(
          "INSERT INTO session_state (key, value) VALUES ('solved_puzzles', '[]')"
        );
        this.ctx.storage.sql.exec(
          "INSERT INTO session_state (key, value) VALUES ('hints_used', '{}')"
        );
      }
    });
  }
  
  // ===== Session Management =====
  
  async joinSession(playerId: string, playerName: string, role?: string): Promise<{ success: boolean; message: string; state: any }> {
    const existing = this.ctx.storage.sql.exec<{ name: string }>(
      "SELECT name FROM players WHERE player_id = ?",
      playerId
    ).one();
    
    if (existing) {
      return {
        success: true,
        message: `Welcome back, ${existing.name}!`,
        state: await this.getState()
      };
    }
    
    this.ctx.storage.sql.exec(
      "INSERT INTO players (player_id, name, role, joined_at) VALUES (?, ?, ?, ?)",
      playerId,
      playerName,
      role || "agent",
      Date.now()
    );
    
    this.logAction(playerName, "joined_session", undefined, `${playerName} joined as ${role || "agent"}`);
    
    return {
      success: true,
      message: `${playerName} joined the heist!`,
      state: await this.getState()
    };
  }
  
  async getState(): Promise<any> {
    const currentRoom = parseInt(this.ctx.storage.sql.exec<{ value: string }>(
      "SELECT value FROM session_state WHERE key = 'current_room'"
    ).one()!.value);
    
    const unlockedDoors = JSON.parse(this.ctx.storage.sql.exec<{ value: string }>(
      "SELECT value FROM session_state WHERE key = 'unlocked_doors'"
    ).one()!.value);
    
    const solvedPuzzles = JSON.parse(this.ctx.storage.sql.exec<{ value: string }>(
      "SELECT value FROM session_state WHERE key = 'solved_puzzles'"
    ).one()!.value);
    
    const hintsUsed = JSON.parse(this.ctx.storage.sql.exec<{ value: string }>(
      "SELECT value FROM session_state WHERE key = 'hints_used'"
    ).one()!.value);
    
    const players = this.ctx.storage.sql.exec<{ player_id: string; name: string; role: string | null }>(
      "SELECT player_id, name, role FROM players"
    ).toArray();
    
    const inventory = this.ctx.storage.sql.exec<{ item_name: string; picked_up_by: string }>(
      "SELECT item_name, picked_up_by FROM inventory"
    ).toArray();
    
    const recentActions = this.ctx.storage.sql.exec<Action>(
      "SELECT timestamp, player, action, target, result FROM action_log ORDER BY id DESC LIMIT 20"
    ).toArray();
    
    return {
      currentRoom,
      unlockedDoors,
      solvedPuzzles,
      hintsUsed,
      players,
      inventory: inventory.map(i => ({ item: i.item_name, takenBy: i.picked_up_by })),
      recentActions: recentActions.reverse()
    };
  }
  
  async getRecentActions(limit: number = 10): Promise<Action[]> {
    return this.ctx.storage.sql.exec<Action>(
      "SELECT timestamp, player, action, target, result FROM action_log ORDER BY id DESC LIMIT ?",
      limit
    ).toArray().reverse();
  }
  
  // ===== Game Actions =====
  
  async lookAround(playerId: string): Promise<{ room: Room; objects: GameObject[]; exits: string[]; canProgress: boolean }> {
    const player = this.getPlayerName(playerId);
    const roomId = this.getCurrentRoom();
    
    // Fetch room data from D1
    const room = await this.env.DB.prepare(
      "SELECT * FROM rooms WHERE id = ?"
    ).bind(roomId).first<Room>();
    
    if (!room) throw new Error("Room not found");
    
    const objects = await this.env.DB.prepare(
      "SELECT * FROM objects WHERE room_id = ?"
    ).bind(roomId).all<GameObject>();
    
    const exits = room.exits.split(',').map(e => e.trim()).filter(e => e !== 'none');
    const unlockedDoors = this.getUnlockedDoors();
    const canProgress = exits.some(exit => unlockedDoors.includes(exit) || exit === 'lobby');
    
    this.logAction(player, "look_around", room.name, `Surveyed ${room.name}`);
    
    return {
      room,
      objects: objects.results || [],
      exits,
      canProgress
    };
  }
  
  async examineObject(playerId: string, objectName: string): Promise<{ object: GameObject; specialInfo?: string }> {
    const player = this.getPlayerName(playerId);
    const roomId = this.getCurrentRoom();
    
    const object = await this.env.DB.prepare(
      "SELECT * FROM objects WHERE room_id = ? AND name = ?"
    ).bind(roomId, objectName).first<GameObject>();
    
    if (!object) {
      this.logAction(player, "examine", objectName, "Object not found in this room");
      throw new Error(`Object '${objectName}' not found in this room`);
    }
    
    let specialInfo: string | undefined;
    
    // Check for hidden items
    if (objectName === 'flower-arrangement') {
      const hasKey = this.hasInventoryItem('gallery-a-key');
      if (!hasKey) {
        specialInfo = "Searching through the flowers, you find a brass key attached to a tag reading 'Gallery A Access'! (Use use_item to take it)";
      }
    }
    
    this.logAction(player, "examine", objectName, `Examined ${object.name}`);
    
    return { object, specialInfo };
  }
  
  async useItem(playerId: string, itemName: string, action: string, target?: string): Promise<{ success: boolean; message: string; itemAdded?: string; doorUnlocked?: string; roomChanged?: number }> {
    const player = this.getPlayerName(playerId);
    const roomId = this.getCurrentRoom();
    
    // Handle taking items
    if (action === 'take') {
      const object = await this.env.DB.prepare(
        "SELECT * FROM objects WHERE room_id = ? AND name = ?"
      ).bind(roomId, itemName).first<GameObject>();
      
      if (!object) {
        return { success: false, message: "Object not found in this room" };
      }
      
      if (!object.is_takeable && itemName !== 'gallery-a-key') {
        return { success: false, message: "You can't take that" };
      }
      
      // Special handling for hidden key
      if (itemName === 'gallery-a-key') {
        this.addToInventory('gallery-a-key', player);
        this.logAction(player, "take", itemName, `${player} took the brass gallery key`);
        return { success: true, message: "You carefully extract the brass key from the flowers and add it to your shared inventory", itemAdded: 'gallery-a-key' };
      }
      
      this.addToInventory(itemName, player);
      this.logAction(player, "take", itemName, `${player} took ${itemName}`);
      return { success: true, message: `Added ${itemName} to shared inventory`, itemAdded: itemName };
    }
    
    // Handle using keys
    if (action === 'unlock' && target) {
      if (itemName === 'gallery-a-key' && target === 'archives-door') {
        if (this.hasInventoryItem('gallery-a-key')) {
          this.unlockDoor('archives');
          this.addSolvedPuzzle('archives-door-unlock');
          this.logAction(player, "unlock", target, `${player} unlocked the archives door`);
          return { success: true, message: "The brass key fits perfectly! The Archives door swings open silently.", doorUnlocked: 'archives' };
        } else {
          return { success: false, message: "You don't have that key" };
        }
      }
    }
    
    // Handle opening doors
    if (action === 'open' && target) {
      const unlocked = this.getUnlockedDoors();
      if (unlocked.includes(target)) {
        this.setCurrentRoom(this.getRoomIdFromExit(target));
        this.logAction(player, "move", target, `${player} moved to ${target}`);
        return { success: true, message: `Moving to ${target}...`, roomChanged: this.getCurrentRoom() };
      } else {
        return { success: false, message: "That door is locked" };
      }
    }
    
    return { success: false, message: "That action doesn't work here" };
  }
  
  async openDrawer(playerId: string, drawerId: string): Promise<{ success: boolean; contents?: string; message: string }> {
    const player = this.getPlayerName(playerId);
    
    const drawer = await this.env.DB.prepare(
      "SELECT * FROM drawers WHERE id = ?"
    ).bind(drawerId).first<Drawer>();
    
    if (!drawer) {
      return { success: false, message: "Drawer not found" };
    }
    
    if (drawer.locked) {
      return { success: false, message: "This drawer is locked" };
    }
    
    this.logAction(player, "open_drawer", drawerId, `${player} opened ${drawerId}`);
    
    return {
      success: true,
      contents: drawer.contents || "The drawer is empty",
      message: "Drawer opened"
    };
  }
  
  async enterCode(playerId: string, code: string, target?: string): Promise<{ success: boolean; message: string; unlocked?: string; roomChanged?: number }> {
    const player = this.getPlayerName(playerId);
    const roomId = this.getCurrentRoom();
    
    // Special handling for catalog drawer
    if (code === '7734' && target === 'card-catalog') {
      this.addSolvedPuzzle('card-catalog-7734');
      this.logAction(player, "enter_code", "card-catalog-7734", "Unlocked catalog drawer 7734");
      return {
        success: true,
        message: "The drawer slides open smoothly. Inside is a catalog card: 'Bronze sculpture, Florence, 1489. Vault exhibition code: 3891. This is the complete 4-digit code obtained by combining room digits 3-8-9-1.'",
        unlocked: 'card-catalog-7734'
      };
    }
    
    // Check vault code
    if (code === '3891' && roomId === 4) {
      this.unlockDoor('vault');
      this.addSolvedPuzzle('vault-code');
      this.setCurrentRoom(5);
      this.logAction(player, "enter_code", "vault-keypad", `${player} entered correct vault code`);
      return {
        success: true,
        message: "BEEP BEEP BEEP - The keypad flashes green! The vault door's locking bolts retract with a satisfying CLUNK. The path to the diamond is open!",
        unlocked: 'vault',
        roomChanged: 5
      };
    }
    
    // Check against puzzles in DB
    const puzzle = await this.env.DB.prepare(
      "SELECT * FROM puzzles WHERE solution_hash = ?"
    ).bind(code).first<Puzzle>();
    
    if (puzzle) {
      this.addSolvedPuzzle(puzzle.puzzle_type);
      if (puzzle.unlocks_what) {
        this.unlockDoor(puzzle.unlocks_what);
      }
      this.logAction(player, "enter_code", target || "puzzle", puzzle.success_message);
      return { success: true, message: puzzle.success_message, unlocked: puzzle.unlocks_what || undefined };
    }
    
    this.logAction(player, "enter_code", target || "unknown", "Incorrect code");
    return { success: false, message: "BEEP - Access Denied. The code is incorrect." };
  }
  
  async getInventory(): Promise<{ items: Array<{ item: string; takenBy: string; takenAt: number }> }> {
    const inventory = this.ctx.storage.sql.exec<{ item_name: string; picked_up_by: string; picked_up_at: number }>(
      "SELECT item_name, picked_up_by, picked_up_at FROM inventory"
    ).toArray();
    
    return {
      items: inventory.map(i => ({
        item: i.item_name,
        takenBy: i.picked_up_by,
        takenAt: i.picked_up_at
      }))
    };
  }
  
  async getHints(playerId: string, roomId?: number): Promise<{ hints: string[]; hintsUsedInRoom: number; totalAvailable: number }> {
    const player = this.getPlayerName(playerId);
    const targetRoom = roomId || this.getCurrentRoom();
    
    const hintsUsed = this.getHintsUsed();
    const usedInRoom = hintsUsed[targetRoom] || 0;
    
    const allHints = await this.env.DB.prepare(
      "SELECT * FROM hints WHERE room_id = ? ORDER BY sequence"
    ).bind(targetRoom).all<Hint>();
    
    const availableHints = (allHints.results || []).slice(0, usedInRoom + 1);
    
    if (availableHints.length > usedInRoom) {
      this.incrementHintsUsed(targetRoom);
      this.logAction(player, "get_hint", `room-${targetRoom}`, `${player} requested hint ${usedInRoom + 1}`);
    }
    
    return {
      hints: availableHints.map(h => h.hint_text),
      hintsUsedInRoom: usedInRoom + 1,
      totalAvailable: (allHints.results || []).length
    };
  }
  
  // ===== Helper Methods =====
  
  private getPlayerName(playerId: string): string {
    const player = this.ctx.storage.sql.exec<{ name: string }>(
      "SELECT name FROM players WHERE player_id = ?",
      playerId
    ).one();
    return player?.name || playerId;
  }
  
  private getCurrentRoom(): number {
    const result = this.ctx.storage.sql.exec<{ value: string }>(
      "SELECT value FROM session_state WHERE key = 'current_room'"
    ).one();
    return parseInt(result!.value);
  }
  
  private setCurrentRoom(roomId: number): void {
    this.ctx.storage.sql.exec(
      "UPDATE session_state SET value = ? WHERE key = 'current_room'",
      roomId.toString()
    );
  }
  
  private getUnlockedDoors(): string[] {
    const result = this.ctx.storage.sql.exec<{ value: string }>(
      "SELECT value FROM session_state WHERE key = 'unlocked_doors'"
    ).one();
    return JSON.parse(result!.value);
  }
  
  private unlockDoor(doorName: string): void {
    const doors = this.getUnlockedDoors();
    if (!doors.includes(doorName)) {
      doors.push(doorName);
      this.ctx.storage.sql.exec(
        "UPDATE session_state SET value = ? WHERE key = 'unlocked_doors'",
        JSON.stringify(doors)
      );
    }
  }
  
  private addSolvedPuzzle(puzzleId: string): void {
    const result = this.ctx.storage.sql.exec<{ value: string }>(
      "SELECT value FROM session_state WHERE key = 'solved_puzzles'"
    ).one();
    const puzzles = JSON.parse(result!.value);
    if (!puzzles.includes(puzzleId)) {
      puzzles.push(puzzleId);
      this.ctx.storage.sql.exec(
        "UPDATE session_state SET value = ? WHERE key = 'solved_puzzles'",
        JSON.stringify(puzzles)
      );
    }
  }
  
  private getHintsUsed(): Record<number, number> {
    const result = this.ctx.storage.sql.exec<{ value: string }>(
      "SELECT value FROM session_state WHERE key = 'hints_used'"
    ).one();
    return JSON.parse(result!.value);
  }
  
  private incrementHintsUsed(roomId: number): void {
    const hintsUsed = this.getHintsUsed();
    hintsUsed[roomId] = (hintsUsed[roomId] || 0) + 1;
    this.ctx.storage.sql.exec(
      "UPDATE session_state SET value = ? WHERE key = 'hints_used'",
      JSON.stringify(hintsUsed)
    );
  }
  
  private hasInventoryItem(itemName: string): boolean {
    const result = this.ctx.storage.sql.exec<{ item_name: string }>(
      "SELECT item_name FROM inventory WHERE item_name = ?",
      itemName
    ).one();
    return !!result;
  }
  
  private addToInventory(itemName: string, playerName: string): void {
    if (!this.hasInventoryItem(itemName)) {
      this.ctx.storage.sql.exec(
        "INSERT INTO inventory (item_name, picked_up_by, picked_up_at) VALUES (?, ?, ?)",
        itemName,
        playerName,
        Date.now()
      );
    }
  }
  
  private logAction(player: string, action: string, target: string | undefined, result: string): void {
    this.ctx.storage.sql.exec(
      "INSERT INTO action_log (timestamp, player, action, target, result) VALUES (?, ?, ?, ?, ?)",
      Date.now(),
      player,
      action,
      target || null,
      result
    );
  }
  
  private getRoomIdFromExit(exitName: string): number {
    const roomMap: Record<string, number> = {
      'lobby': 1,
      'gallery-a': 2,
      'archives': 3,
      'vault-access': 4,
      'vault': 5
    };
    return roomMap[exitName] || 1;
  }
}
