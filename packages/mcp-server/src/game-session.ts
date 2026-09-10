import { DurableObject } from "cloudflare:workers";
import type { Env, Action, Room, GameObject, Drawer, Puzzle, Hint } from "./types";

// Row shape returned by the action_log table (DO SQL rows need an index-signature-compatible type)
type ActionRow = { timestamp: number; player: string; action: string; target: string | null; result: string };

// Shape returned by getState() / get_state (polled by Stage and Operator clients)
export interface SessionStateView {
  currentRoom: number;
  unlockedDoors: string[];
  solvedPuzzles: string[];
  hintsUsed: Record<number, number>;
  players: Array<{ player_id: string; name: string; role: string | null }>;
  inventory: Array<{ item: string; takenBy: string }>;
  recentActions: Action[];
}

// Canonical door names == exit names in rooms.exits ('gallery-a', 'archives', 'vault-access', 'vault').
// Clients may say 'gallery-a-door' or 'archives-door'; normalizeDoor() maps those to the canonical name.
const EXIT_TO_ROOM: Record<string, number> = {
  'lobby': 1,
  'gallery-a': 2,
  'archives': 3,
  'vault-access': 4,
  'vault': 5
};

// Which doors each key opens. The brass key from the lobby flowers is tagged
// "Gallery A Access"; the phone Post-it also says it's the key for the Archive door.
const KEY_OPENS: Record<string, string[]> = {
  'gallery-a-key': ['gallery-a', 'archives']
};

// Hidden items that are found by examining a room object rather than being an object themselves.
const HIDDEN_ITEMS: Record<string, { room: number; foundIn: string; takeMessage: string }> = {
  'gallery-a-key': {
    room: 1,
    foundIn: 'flower-arrangement',
    takeMessage: "You carefully extract the brass key from the flowers and add it to your shared inventory"
  }
};

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
      ).toArray()[0];
      
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
  
  async joinSession(playerId: string, playerName: string, role?: string): Promise<{ success: boolean; message: string; state: SessionStateView }> {
    const existing = this.ctx.storage.sql.exec<{ name: string }>(
      "SELECT name FROM players WHERE player_id = ?",
      playerId
    ).toArray()[0];
    
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
  
  async getState(): Promise<SessionStateView> {
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
    
    const recentActions = this.ctx.storage.sql.exec<ActionRow>(
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
    return this.ctx.storage.sql.exec<ActionRow>(
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
    
    const exits = this.parseExits(room.exits);
    const canProgress = exits.some(exit => this.isDoorOpen(exit, roomId));
    
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
        specialInfo = "Searching through the flowers, you find a brass key attached to a tag reading 'Gallery A Access'! (Use use_item with action 'take' and itemName 'gallery-a-key' to take it)";
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
      // Hidden items (e.g. the key in the flowers) are not rows in `objects`, so check them
      // before the room-object lookup. Taking the container ("flower-arrangement") also works.
      const hiddenName = HIDDEN_ITEMS[itemName] ? itemName
        : Object.keys(HIDDEN_ITEMS).find(k => HIDDEN_ITEMS[k].foundIn === itemName);
      if (hiddenName) {
        const hidden = HIDDEN_ITEMS[hiddenName];
        if (hidden.room !== roomId) {
          return { success: false, message: "Object not found in this room" };
        }
        if (this.hasInventoryItem(hiddenName)) {
          return { success: false, message: `${hiddenName} is already in the shared inventory` };
        }
        this.addToInventory(hiddenName, player);
        this.logAction(player, "take", hiddenName, `${player} took the ${hiddenName}`);
        return { success: true, message: hidden.takeMessage, itemAdded: hiddenName };
      }
      
      const object = await this.env.DB.prepare(
        "SELECT * FROM objects WHERE room_id = ? AND name = ?"
      ).bind(roomId, itemName).first<GameObject>();
      
      if (!object) {
        return { success: false, message: "Object not found in this room" };
      }
      
      if (!object.is_takeable) {
        return { success: false, message: "You can't take that" };
      }
      
      this.addToInventory(itemName, player);
      this.logAction(player, "take", itemName, `${player} took ${itemName}`);
      return { success: true, message: `Added ${itemName} to shared inventory`, itemAdded: itemName };
    }
    
    const exits = await this.getRoomExits(roomId);
    
    // Handle using keys on doors: use_item { itemName: 'gallery-a-key', action: 'unlock'|'use', target: 'gallery-a' }
    if ((action === 'unlock' || action === 'use') && KEY_OPENS[itemName]) {
      if (!this.hasInventoryItem(itemName)) {
        return { success: false, message: "You don't have that key" };
      }
      // Default to the first locked exit in this room that the key fits
      const door = target
        ? this.normalizeDoor(target)
        : exits.find(e => KEY_OPENS[itemName].includes(e) && !this.isDoorOpen(e, roomId));
      if (!door || !exits.includes(door)) {
        return { success: false, message: `There's no ${target || 'locked'} door in this room. Exits: ${exits.join(', ')}` };
      }
      if (!KEY_OPENS[itemName].includes(door)) {
        return { success: false, message: `The ${itemName} doesn't fit the ${door} door` };
      }
      this.unlockDoor(door);
      this.addSolvedPuzzle(`${door}-door-unlock`);
      this.logAction(player, "unlock", door, `${player} unlocked the ${door} door`);
      return {
        success: true,
        message: `The brass key fits perfectly! The ${this.doorLabel(door)} door swings open silently. Use use_item with action 'open' and target '${door}' to go through.`,
        doorUnlocked: door
      };
    }
    
    // Handle moving the painting that hides the Vault Access door (room 3)
    if (itemName === 'hidden-painting' && roomId === 3 && ['pull', 'press', 'use', 'open'].includes(action)) {
      this.unlockDoor('vault-access');
      this.addSolvedPuzzle('hidden-painting');
      this.logAction(player, "move_painting", itemName, `${player} swung the painting aside, revealing the Vault Access door`);
      return {
        success: true,
        message: "The painting swings aside on its hinges, revealing a reinforced door labeled 'Vault Access'. It's unlocked. Use use_item with action 'open' and target 'vault-access' to go through.",
        doorUnlocked: 'vault-access'
      };
    }
    
    // Handle opening doors / moving between rooms
    if (action === 'open') {
      const door = this.normalizeDoor(target || itemName);
      if (!exits.includes(door)) {
        return { success: false, message: `There's no ${door} exit here. Exits: ${exits.join(', ')}` };
      }
      if (!this.isDoorOpen(door, roomId)) {
        // Convenience: if the team holds a key that fits, open it in one step
        const key = Object.keys(KEY_OPENS).find(k => KEY_OPENS[k].includes(door) && this.hasInventoryItem(k));
        if (!key) {
          return { success: false, message: `That door is locked. Find the key or code that opens ${door}.` };
        }
        this.unlockDoor(door);
        this.addSolvedPuzzle(`${door}-door-unlock`);
        this.logAction(player, "unlock", door, `${player} unlocked the ${door} door with the ${key}`);
      }
      const newRoom = EXIT_TO_ROOM[door];
      this.setCurrentRoom(newRoom);
      this.logAction(player, "move", door, `${player} moved to ${this.doorLabel(door)}`);
      return { success: true, message: `You step through the ${this.doorLabel(door)} door...`, roomChanged: newRoom };
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
    
    // Locked drawers open once their code puzzle is solved (e.g. enter_code 7734 -> 'card-catalog-7734')
    if (drawer.locked && !this.getSolvedPuzzles().includes(drawerId)) {
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
    ).toArray()[0];
    return player?.name || playerId;
  }
  
  private getCurrentRoom(): number {
    const result = this.ctx.storage.sql.exec<{ value: string }>(
      "SELECT value FROM session_state WHERE key = 'current_room'"
    ).toArray()[0];
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
    ).toArray()[0];
    return JSON.parse(result!.value);
  }
  
  private unlockDoor(doorName: string): void {
    const door = this.normalizeDoor(doorName);
    const doors = this.getUnlockedDoors();
    if (!doors.includes(door)) {
      doors.push(door);
      this.ctx.storage.sql.exec(
        "UPDATE session_state SET value = ? WHERE key = 'unlocked_doors'",
        JSON.stringify(doors)
      );
    }
  }
  
  /** 'gallery-a-door' / 'Gallery A' -> 'gallery-a'; unknown names pass through unchanged. */
  private normalizeDoor(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/-door$/, '');
  }
  
  private doorLabel(door: string): string {
    return door.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  
  private parseExits(exits: string): string[] {
    return exits.split(',').map(e => e.trim()).filter(e => e && e !== 'none');
  }
  
  private async getRoomExits(roomId: number): Promise<string[]> {
    const room = await this.env.DB.prepare(
      "SELECT exits FROM rooms WHERE id = ?"
    ).bind(roomId).first<{ exits: string }>();
    return room ? this.parseExits(room.exits) : [];
  }
  
  /** A door is passable if it was unlocked, or if it leads back to a room the team already passed through. */
  private isDoorOpen(door: string, currentRoom: number): boolean {
    const leadsTo = EXIT_TO_ROOM[door];
    if (leadsTo !== undefined && leadsTo < currentRoom) return true;
    return this.getUnlockedDoors().includes(door);
  }
  
  private getSolvedPuzzles(): string[] {
    const result = this.ctx.storage.sql.exec<{ value: string }>(
      "SELECT value FROM session_state WHERE key = 'solved_puzzles'"
    ).toArray()[0];
    return JSON.parse(result!.value);
  }
  
  private addSolvedPuzzle(puzzleId: string): void {
    const puzzles = this.getSolvedPuzzles();
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
    ).toArray()[0];
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
    ).toArray()[0];
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
}
