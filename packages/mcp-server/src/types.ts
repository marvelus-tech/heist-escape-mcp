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

// ===== Story-Logic =====

/**
 * Finale outcome exposed on get_state for the Stage.
 * 'replica'   -> the pedestal stone (a decoy) is in inventory; the twist is live.
 * 'authentic' -> the real Sunburst Diamond from the steel shelves is in inventory; true win.
 * false       -> nothing claimed yet.
 */
export type HeistOutcome = 'replica' | 'authentic' | false;

/** Boolean story flags persisted per session (finale state machine + Elena reveal). */
export interface StoryFlags {
  /** Catalog drawer 7734 opened; Elena's note has been read. */
  elena_revealed?: boolean;
  /** The pedestal "Sunburst Diamond" was taken. Apparent success. */
  replica_taken?: boolean;
  /** Someone examined the pedestal stone closely enough to spot the replica evidence. */
  replica_identified?: boolean;
  /** curator-keycard was used on steel-shelves; the authentic stone can now be taken. */
  shelves_unlocked?: boolean;
  /** sunburst-diamond-authentic is in inventory. True heist complete. */
  authentic_taken?: boolean;
}

/** Who a briefing is written for. Operator/watch get the cover story; examiner gets the truth. */
export type BriefingAudience = 'operator' | 'examiner' | 'watch';
