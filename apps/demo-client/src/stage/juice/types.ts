/**
 * Shared types for the Stage juice / feedback layer (Module C).
 *
 * Everything here mirrors the wire shapes already returned by the Worker
 * REST API (`/api/get_recent_actions`, `/api/get_inventory`, `/api/get_state`).
 * The juice layer never talks to the network itself; StagePage feeds it.
 */

/** One row from the action log. `action`/`target` are present on the wire but optional here. */
export interface ActionLogEntry {
  player: string;
  result: string;
  timestamp: string | number;
  action?: string;
  target?: string;
}

export interface InventoryItem {
  item: string;
  takenBy: string;
}

/** Subset of `/api/get_state` the juice layer cares about. */
export interface StageStateLike {
  currentRoom?: number;
  unlockedDoors?: string[];
  solvedPuzzles?: string[];
  inventory?: InventoryItem[];
  recentActions?: ActionLogEntry[];
}

export type JuiceTone = 'success' | 'error' | 'info';

export type JuiceEventKind =
  | 'examine'
  | 'item-acquired'
  | 'drawer-opened'
  | 'door-unlocked'
  | 'code-accepted'
  | 'code-rejected'
  | 'room-changed'
  | 'player-joined'
  | 'vault-open'
  | 'heist-complete';

/**
 * A normalized, display-ready event derived from live action/state strings.
 * StagePage maps `kind` to GameFeel (shake/particles/audio); the juice layer
 * maps it to toasts, examine cards and the climax ribbon.
 */
export interface JuiceEvent {
  kind: JuiceEventKind;
  tone: JuiceTone;
  /** Short uppercase-able headline, e.g. "Key acquired". */
  title: string;
  /** Optional one-liner shown under the title (usually the raw result string). */
  body?: string;
  player?: string;
  /** Object / item / door name if the event has one. */
  subject?: string;
}

export interface StageJuiceOptions {
  /** Called once per new event so the host can trigger GameFeel etc. */
  onEvent?: (event: JuiceEvent) => void;
  /** Expose `window.HeistJuice` helpers for demos. Defaults to true. */
  debug?: boolean;
  /** Override the reduced-motion check (mainly for tests/demos). */
  reducedMotion?: boolean;
}
