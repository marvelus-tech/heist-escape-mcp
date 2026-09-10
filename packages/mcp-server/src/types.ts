// Type definitions for the Heist Escape MCP Server
import type { GameSession } from "./game-session";

export interface Env {
  GAME_SESSION: DurableObjectNamespace<GameSession>;
  DB: D1Database;
}

export interface Player {
  name: string;
  role?: string;
  joinedAt: number;
}

export interface SessionState {
  sessionId: string;
  players: Record<string, Player>;
  currentRoom: number;
  inventory: string[];
  unlockedDoors: string[];
  solvedPuzzles: string[];
  hintsUsed: Record<number, number>;
  actionLog: Action[];
  createdAt: number;
}

export interface Action {
  timestamp: number;
  player: string;
  action: string;
  target?: string | null;
  result: string;
}

export interface Room {
  id: number;
  name: string;
  description: string;
  atmosphere: string;
  exits: string;
}

export interface GameObject {
  id: number;
  room_id: number;
  name: string;
  short_description: string;
  full_description: string;
  interaction_hints: string | null;
  is_takeable: number;
  is_container: number;
  locked: number;
}

export interface Drawer {
  id: string;
  object_id: number;
  contents: string | null;
  locked: number;
  lock_code_hash: string | null;
}

export interface Puzzle {
  id: number;
  room_id: number;
  puzzle_type: string;
  solution_hash: string;
  success_message: string;
  failure_message: string;
  unlocks_what: string | null;
}

export interface Hint {
  id: number;
  room_id: number;
  sequence: number;
  hint_text: string;
}
