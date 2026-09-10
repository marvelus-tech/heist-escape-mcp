/**
 * Pure classification helpers: live action-log rows and session state in,
 * normalized JuiceEvents out. No DOM, no network, so this is unit-testable.
 *
 * Detection is intentionally string-driven (what the Worker already logs)
 * rather than hardcoding puzzle answers. The only fixed vocabulary here is
 * generic heist language: "vault", "diamond", "unlocked", "incorrect".
 */

import type { ActionLogEntry, JuiceEvent, StageStateLike } from './types';

/** Stable identity for dedupe across polls (the API has no row id). */
export function actionKey(a: ActionLogEntry): string {
  return `${a.timestamp}|${a.player}|${a.action ?? ''}|${a.result}`;
}

/** "gallery-a-key" -> "Gallery A Key" */
export function humanize(raw: string | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const isDiamond = (s: string) => /diamond/i.test(s);
const isVault = (s: string) => /\bvault\b/i.test(s);

/**
 * Map one action-log row to a JuiceEvent, or null when it should stay silent
 * (surveys, hints, failed lookups). Prefers the structured `action` column and
 * falls back to result-string heuristics for older rows.
 */
export function classifyAction(a: ActionLogEntry): JuiceEvent | null {
  const result = a.result ?? '';
  const lower = result.toLowerCase();
  const action = (a.action ?? inferAction(lower)).toLowerCase();
  const target = a.target ?? '';
  const player = a.player;

  switch (action) {
    case 'examine': {
      if (/not found/.test(lower)) return null;
      const subject = target || result.replace(/^examined\s+/i, '');
      return {
        kind: 'examine',
        tone: 'info',
        title: 'Examine clue',
        body: result,
        player,
        subject
      };
    }

    case 'take': {
      const subject = target || result.replace(/^.*\btook\b\s*(the\s+)?/i, '');
      if (isDiamond(subject) || isDiamond(lower)) {
        return {
          kind: 'heist-complete',
          tone: 'success',
          title: `${humanize(subject) || 'Diamond'} secured`,
          body: result,
          player,
          subject
        };
      }
      return {
        kind: 'item-acquired',
        tone: 'success',
        title: `${humanize(subject) || 'Item'} acquired`,
        body: result,
        player,
        subject
      };
    }

    case 'unlock': {
      const subject = target || result.replace(/^.*\bunlocked\b\s*(the\s+)?/i, '');
      if (isVault(subject) || isVault(lower)) {
        return { kind: 'vault-open', tone: 'success', title: 'Vault open', body: result, player, subject };
      }
      return {
        kind: 'door-unlocked',
        tone: 'success',
        title: `${humanize(subject) || 'Door'} unlocked`,
        body: result,
        player,
        subject
      };
    }

    case 'enter_code': {
      // "Unlocked ..." must not trip the failure branch, hence the word boundary.
      if (/incorrect|denied|wrong|invalid|\blocked\b/.test(lower) && !/unlocked|\bcorrect\b/.test(lower)) {
        return { kind: 'code-rejected', tone: 'error', title: 'Code rejected', body: result, player, subject: target };
      }
      if (isVault(lower) || isVault(target)) {
        return { kind: 'vault-open', tone: 'success', title: 'Vault open', body: result, player, subject: target };
      }
      return { kind: 'code-accepted', tone: 'success', title: 'Code accepted', body: result, player, subject: target };
    }

    case 'open_drawer': {
      const subject = target || result.replace(/^.*\bopened\b\s*/i, '');
      return {
        kind: 'drawer-opened',
        tone: 'info',
        title: `${humanize(subject) || 'Drawer'} opened`,
        player,
        subject
      };
    }

    case 'move': {
      const subject = target || result.replace(/^.*\bmoved to\b\s*/i, '');
      return {
        kind: 'room-changed',
        tone: 'info',
        title: `Entering ${humanize(subject) || 'next room'}`,
        player,
        subject
      };
    }

    case 'joined_session': {
      return { kind: 'player-joined', tone: 'info', title: `${player} joined`, body: result, player };
    }

    default:
      return null;
  }
}

/** Best-effort action name for rows that lack the `action` column. */
function inferAction(lower: string): string {
  if (/^examined\b/.test(lower)) return 'examine';
  if (/\btook\b/.test(lower)) return 'take';
  if (/\bunlocked\b/.test(lower)) return 'unlock';
  if (/incorrect code|access denied|correct .*code|code\b/.test(lower)) return 'enter_code';
  if (/\bopened\b/.test(lower)) return 'open_drawer';
  if (/\bmoved to\b/.test(lower)) return 'move';
  if (/\bjoined\b/.test(lower)) return 'joined_session';
  return '';
}

/** Given the previous and current action lists, return only the unseen rows (oldest first). */
export function diffActions(seen: Set<string>, actions: ActionLogEntry[]): ActionLogEntry[] {
  const fresh: ActionLogEntry[] = [];
  for (const a of actions) {
    const key = actionKey(a);
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push(a);
  }
  return fresh;
}

export type ClimaxStage = 'none' | 'vault-open' | 'heist-complete';

/**
 * Derive the climax stage from session state alone. Used so a page reload
 * mid-heist still shows the ribbon without replaying toasts.
 */
export function detectClimax(state: StageStateLike): { stage: ClimaxStage; subject?: string } {
  const prize = state.inventory?.find((i) => isDiamond(i.item));
  if (prize) return { stage: 'heist-complete', subject: prize.item };

  const vaultDoor = state.unlockedDoors?.find((d) => isVault(d));
  const vaultPuzzle = state.solvedPuzzles?.find((p) => isVault(p));
  if (vaultDoor || vaultPuzzle) return { stage: 'vault-open', subject: vaultDoor ?? vaultPuzzle };

  return { stage: 'none' };
}

const CLIMAX_RANK: Record<ClimaxStage, number> = { none: 0, 'vault-open': 1, 'heist-complete': 2 };

export function isHigherClimax(next: ClimaxStage, current: ClimaxStage): boolean {
  return CLIMAX_RANK[next] > CLIMAX_RANK[current];
}
